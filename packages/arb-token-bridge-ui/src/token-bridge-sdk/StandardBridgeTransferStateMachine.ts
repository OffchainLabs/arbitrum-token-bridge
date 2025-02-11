import { utils } from 'ethers'
import { BridgeTransferStarter } from './BridgeTransferStarter'
import { BridgeTransferStarterFactory } from './BridgeTransferStarterFactory'
import { isGatewayRegistered } from '../util/TokenUtils'
import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'
import {
  DefaultTransferContext,
  DefaultTransferState,
  DefaultTransferStateType,
  validateDefaultTransfer
} from './DefaultTransferStateMachine'
import { StateMachine } from './StateMachine'
import { TransferOverrides } from './BridgeTransferStarter'

export type StandardBridgeContext = DefaultTransferContext & {
  bridgeTransferStarter?: BridgeTransferStarter
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  selectedToken?: {
    address: string
    symbol: string
    l2Address?: string
  }
  isBatchTransfer?: boolean
  nativeCurrencyDecimals?: number
  overrides?: TransferOverrides
  // Callbacks
  onTokenApprovalNeeded?: () => Promise<boolean>
  onNativeCurrencyApprovalNeeded?: () => Promise<boolean>
  onWithdrawalConfirmationNeeded?: () => Promise<boolean>
  onFirstTimeTokenBridgingConfirmationNeeded?: () => Promise<boolean>
}

export type StandardBridgeStateType = DefaultTransferStateType | 'WAITING_FOR_TOKEN_APPROVAL' | 'WAITING_FOR_NATIVE_CURRENCY_APPROVAL' | 'CONFIRMING_TRANSFER'

export type StandardBridgeState = DefaultTransferState & {
  type: StandardBridgeStateType
  context: StandardBridgeContext
}

// Standard bridge state transitions
export const checkStandardBridgeApprovals = async (
  state: StandardBridgeState
): Promise<StandardBridgeState> => {
  const { context } = state
  const {
    amount,
    amount2,
    signer,
    sourceChainId,
    destinationChainId,
    sourceChainErc20Address,
    destinationChainErc20Address,
    destinationAddress,
    selectedToken,
    isDepositMode,
    sourceChainProvider,
    destinationChainProvider,
    isBatchTransfer,
    nativeCurrencyDecimals
  } = context

  // Initialize bridge transfer starter
  const bridgeTransferStarter = await BridgeTransferStarterFactory.create({
    sourceChainId,
    sourceChainErc20Address,
    destinationChainId,
    destinationChainErc20Address
  })

  // Check for token suspension if it's a deposit
  if (isDepositMode && selectedToken) {
    const isTokenSuspended = !(await isGatewayRegistered({
      erc20ParentChainAddress: selectedToken.address,
      parentChainProvider: sourceChainProvider,
      childChainProvider: destinationChainProvider
    }))

    if (isTokenSuspended) {
      return {
        type: 'ERROR',
        context,
        error: new Error('Token deposits are currently suspended')
      }
    }
  }

  const overrides = {}

  // Handle batch transfer gas estimates
  if (isBatchTransfer && amount2) {
    const gasEstimates = (await bridgeTransferStarter.transferEstimateGas({
      amount,
      signer,
      destinationAddress
    })) as DepositGasEstimates

    if (!gasEstimates.estimatedChildChainSubmissionCost) {
      return {
        type: 'ERROR',
        context,
        error: new Error('Failed to estimate deposit maxSubmissionCost')
      }
    }

    overrides.maxSubmissionCost = utils
      .parseEther(amount2.toString())
      .add(gasEstimates.estimatedChildChainSubmissionCost)
    overrides.excessFeeRefundAddress = destinationAddress
  }

  // Check native currency approval
  const isNativeCurrencyApprovalRequired = await bridgeTransferStarter.requiresNativeCurrencyApproval({
    signer,
    amount,
    destinationAddress,
    options: {
      approvalAmountIncrease:
        isBatchTransfer && amount2 && nativeCurrencyDecimals
          ? utils.parseUnits(amount2.toString(), nativeCurrencyDecimals)
          : undefined
    }
  })

  if (isNativeCurrencyApprovalRequired) {
    return {
      type: 'WAITING_FOR_NATIVE_CURRENCY_APPROVAL',
      context: {
        ...context,
        bridgeTransferStarter,
        overrides
      }
    }
  }

  // Check token approval
  if (selectedToken) {
    const isTokenApprovalRequired = await bridgeTransferStarter.requiresTokenApproval({
      amount,
      signer,
      destinationAddress
    })

    if (isTokenApprovalRequired) {
      return {
        type: 'WAITING_FOR_TOKEN_APPROVAL',
        context: {
          ...context,
          bridgeTransferStarter,
          overrides
        }
      }
    }
  }

  return {
    type: 'CONFIRMING_TRANSFER',
    context: {
      ...context,
      bridgeTransferStarter,
      overrides
    }
  }
}

export const handleStandardBridgeTokenApproval = async (
  state: StandardBridgeState
): Promise<StandardBridgeState> => {
  const { context } = state
  const {
    amount,
    signer,
    onTokenApprovalNeeded,
    isSmartContractWallet,
    onSmartContractWalletDelayNeeded,
    bridgeTransferStarter
  } = context

  if (!bridgeTransferStarter) {
    return {
      type: 'ERROR',
      context,
      error: new Error('Bridge transfer starter not initialized')
    }
  }

  // Get user confirmation
  if (onTokenApprovalNeeded) {
    const confirmed = await onTokenApprovalNeeded()
    if (!confirmed) {
      return {
        type: 'ERROR',
        context,
        error: new Error('User rejected token approval')
      }
    }
  }

  // Show delay for smart contract wallets
  if (isSmartContractWallet && onSmartContractWalletDelayNeeded) {
    await onSmartContractWalletDelayNeeded()
  }

  const approvalTx = await bridgeTransferStarter.approveToken({
    signer,
    amount
  })

  if (approvalTx) {
    await approvalTx.wait()
  }

  return {
    type: 'CONFIRMING_TRANSFER',
    context
  }
}

export const handleStandardBridgeNativeCurrencyApproval = async (
  state: StandardBridgeState
): Promise<StandardBridgeState> => {
  const { context } = state
  const {
    amount,
    signer,
    destinationAddress,
    onNativeCurrencyApprovalNeeded,
    bridgeTransferStarter
  } = context

  if (!bridgeTransferStarter) {
    return {
      type: 'ERROR',
      context,
      error: new Error('Bridge transfer starter not initialized')
    }
  }

  // Get user confirmation
  if (onNativeCurrencyApprovalNeeded) {
    const confirmed = await onNativeCurrencyApprovalNeeded()
    if (!confirmed) {
      return {
        type: 'ERROR',
        context,
        error: new Error('User rejected native currency approval')
      }
    }
  }

  const approvalTx = await bridgeTransferStarter.approveNativeCurrency({
    signer,
    amount,
    destinationAddress
  })

  if (approvalTx) {
    await approvalTx.wait()
  }

  return {
    type: 'CHECKING_APPROVALS',
    context
  }
}

export const confirmStandardBridgeTransfer = async (
  state: StandardBridgeState
): Promise<StandardBridgeState> => {
  const { context } = state
  const {
    isSmartContractWallet,
    onWithdrawalConfirmationNeeded,
    onFirstTimeTokenBridgingConfirmationNeeded,
    onCustomDestinationAddressConfirmationNeeded
  } = context

  // Get first-time bridging confirmation if needed
  if (onFirstTimeTokenBridgingConfirmationNeeded) {
    const confirmed = await onFirstTimeTokenBridgingConfirmationNeeded()
    if (!confirmed) {
      return {
        type: 'ERROR',
        context,
        error: new Error('User declined bridging the token for the first time')
      }
    }
  }

  // Get withdrawal confirmation if needed
  if (!isSmartContractWallet && onWithdrawalConfirmationNeeded) {
    const confirmed = await onWithdrawalConfirmationNeeded()
    if (!confirmed) {
      return {
        type: 'ERROR',
        context,
        error: new Error('User rejected withdrawal')
      }
    }
  }

  // Get custom destination address confirmation if needed
  if (onCustomDestinationAddressConfirmationNeeded) {
    const confirmed = await onCustomDestinationAddressConfirmationNeeded()
    if (!confirmed) {
      return {
        type: 'ERROR',
        context,
        error: new Error('User rejected custom destination address')
      }
    }
  }

  return {
    type: 'EXECUTING_TRANSFER',
    context
  }
}

export const executeStandardBridgeTransfer = async (
  state: StandardBridgeState
): Promise<StandardBridgeState> => {
  const { context } = state
  const {
    amount,
    signer,
    destinationAddress,
    bridgeTransferStarter,
    overrides,
    isSmartContractWallet,
    isTeleportMode,
    isDepositMode,
    selectedToken,
    onTrackEvent
  } = context

  if (!bridgeTransferStarter) {
    return {
      type: 'ERROR',
      context,
      error: new Error('Bridge transfer starter not initialized')
    }
  }

  // Track event before executing transfer
  if (onTrackEvent) {
    onTrackEvent(
      isTeleportMode ? 'Teleport' : isDepositMode ? 'Deposit' : 'Withdraw',
      {
        tokenSymbol: selectedToken?.symbol,
        assetType: selectedToken ? 'ERC-20' : 'ETH',
        accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
        amount: amount.toString(),
        isCustomDestinationTransfer: !!destinationAddress
      }
    )
  }

  // Execute the transfer
  const transfer = await bridgeTransferStarter.transfer({
    amount,
    signer,
    destinationAddress,
    overrides
  })

  return {
    type: 'SUCCESS',
    context,
    result: transfer
  }
}

// Create standard bridge state machine
export const createStandardBridgeTransferStateMachine = () => {
  return new StateMachine<StandardBridgeContext, StandardBridgeStateType, StandardBridgeState>({
    initialState: 'VALIDATING',
    transitions: {
      IDLE: validateDefaultTransfer,
      VALIDATING: validateDefaultTransfer,
      CHECKING_APPROVALS: checkStandardBridgeApprovals,
      WAITING_FOR_TOKEN_APPROVAL: handleStandardBridgeTokenApproval,
      WAITING_FOR_NATIVE_CURRENCY_APPROVAL: handleStandardBridgeNativeCurrencyApproval,
      CONFIRMING_TRANSFER: confirmStandardBridgeTransfer,
      EXECUTING_TRANSFER: executeStandardBridgeTransfer,
      SUCCESS: undefined,
      ERROR: undefined
    }
  })
} 