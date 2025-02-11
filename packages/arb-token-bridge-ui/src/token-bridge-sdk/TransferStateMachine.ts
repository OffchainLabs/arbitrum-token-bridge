import { BigNumber, Signer, utils } from 'ethers'
import { Provider } from '@ethersproject/providers'
import {
  BridgeTransfer,
  TransferOverrides,
  BridgeTransferStarter
} from './BridgeTransferStarter'
import { BridgeTransferStarterFactory } from './BridgeTransferStarterFactory'
import { getBridgeTransferProperties } from './utils'
import { isGatewayRegistered } from '../util/TokenUtils'
import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'
import { CctpTransferStarter } from './CctpTransferStarter'

export type TransferContext = {
  amount: BigNumber
  amount2?: BigNumber
  signer: Signer
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  destinationAddress?: string
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  overrides?: TransferOverrides
  isSmartContractWallet: boolean
  isTeleportMode: boolean
  isDepositMode: boolean
  walletAddress?: string
  selectedToken?: {
    address: string
    symbol: string
    l2Address?: string
  }
  sourceChainId: number
  destinationChainId: number
  isBatchTransfer?: boolean
  nativeCurrencyDecimals?: number
  // CCTP specific
  isCctp?: boolean
  // Internal state
  bridgeTransferStarter?: BridgeTransferStarter
  cctpTransferStarter?: CctpTransferStarter
  // Callbacks for UI interactions
  onTokenApprovalNeeded?: () => Promise<boolean>
  onNativeCurrencyApprovalNeeded?: () => Promise<boolean>
  onWithdrawalConfirmationNeeded?: () => Promise<boolean>
  onCustomDestinationAddressConfirmationNeeded?: () => Promise<boolean>
  onFirstTimeTokenBridgingConfirmationNeeded?: () => Promise<boolean>
  onSmartContractWalletDelayNeeded?: () => Promise<void>
  onCctpDepositConfirmationNeeded?: () => Promise<'bridge-cctp-usd' | 'bridge-normal-usdce' | false>
  onCctpWithdrawalConfirmationNeeded?: () => Promise<boolean>
  // Event tracking
  onTrackEvent?: (event: string, data: Record<string, unknown>) => void
}

export type TransferStateType =
  | 'IDLE'
  | 'VALIDATING'
  | 'CHECKING_APPROVALS'
  | 'WAITING_FOR_NATIVE_CURRENCY_APPROVAL'
  | 'WAITING_FOR_TOKEN_APPROVAL'
  | 'CONFIRMING_CCTP_TRANSFER'
  | 'CONFIRMING_TRANSFER'
  | 'EXECUTING_CCTP_TRANSFER'
  | 'EXECUTING_TRANSFER'
  | 'SUCCESS'
  | 'ERROR'

export type TransferState = {
  type: TransferStateType
  context: TransferContext
  error?: Error
  result?: BridgeTransfer
}

type StateTransition = (state: TransferState) => Promise<TransferState>

// State transition functions
export const validateTransfer = async (
  state: TransferState
): Promise<TransferState> => {
  const { context } = state
  const {
    signer,
    sourceChainId,
    destinationChainId,
    sourceChainErc20Address,
    selectedToken,
    isSmartContractWallet,
    isTeleportMode,
    destinationAddress,
    isCctp
  } = context

  if (!signer) {
    return {
      type: 'ERROR',
      context,
      error: new Error('Signer is required')
    }
  }

  // SC Teleport transfers aren't enabled yet
  if (isSmartContractWallet && isTeleportMode) {
    return {
      type: 'ERROR',
      context,
      error: new Error(
        'Smart contract wallet teleport transfers are not supported'
      )
    }
  }

  // Check if withdrawal and token address is missing
  const { isWithdrawal } = getBridgeTransferProperties({
    sourceChainId,
    sourceChainErc20Address,
    destinationChainId
  })

  if (isWithdrawal && selectedToken && !sourceChainErc20Address) {
    return {
      type: 'ERROR',
      context,
      error: new Error(
        'Source chain token address not found for ERC-20 withdrawal'
      )
    }
  }

  // Check destination address validity
  if (destinationAddress && !destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return {
      type: 'ERROR',
      context,
      error: new Error('Invalid destination address')
    }
  }

  return {
    type: 'CHECKING_APPROVALS',
    context: {
      ...context,
      // Initialize CCTP transfer starter if needed
      cctpTransferStarter: isCctp
        ? new CctpTransferStarter({
            sourceChainProvider: context.sourceChainProvider,
            destinationChainProvider: context.destinationChainProvider
          })
        : undefined
    }
  }
}

export const checkApprovals = async (
  state: TransferState
): Promise<TransferState> => {
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
    nativeCurrencyDecimals,
    isCctp,
    cctpTransferStarter
  } = context

  if (isCctp && cctpTransferStarter) {
    const isTokenApprovalRequired = await cctpTransferStarter.requiresTokenApproval({
      amount,
      signer
    })

    if (isTokenApprovalRequired) {
      return {
        type: 'WAITING_FOR_TOKEN_APPROVAL',
        context
      }
    }

    return {
      type: 'CONFIRMING_CCTP_TRANSFER',
      context
    }
  }

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

  const overrides: TransferOverrides = {}

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

export const handleNativeCurrencyApproval = async (
  state: TransferState
): Promise<TransferState> => {
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

  // Execute approval
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

export const handleTokenApproval = async (
  state: TransferState
): Promise<TransferState> => {
  const { context } = state
  const {
    amount,
    signer,
    onTokenApprovalNeeded,
    isSmartContractWallet,
    onSmartContractWalletDelayNeeded,
    bridgeTransferStarter,
    isCctp,
    cctpTransferStarter
  } = context

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

  // Execute approval
  if (isCctp && cctpTransferStarter) {
    const approvalTx = await cctpTransferStarter.approveToken({
      signer,
      amount
    })

    if (approvalTx) {
      await approvalTx.wait()
    }

    return {
      type: 'CONFIRMING_CCTP_TRANSFER',
      context
    }
  }

  if (!bridgeTransferStarter) {
    return {
      type: 'ERROR',
      context,
      error: new Error('Bridge transfer starter not initialized')
    }
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

export const confirmCctpTransfer = async (
  state: TransferState
): Promise<TransferState> => {
  const { context } = state
  const {
    isDepositMode,
    onCctpDepositConfirmationNeeded,
    onCctpWithdrawalConfirmationNeeded,
    isSmartContractWallet,
    onCustomDestinationAddressConfirmationNeeded,
    destinationAddress,
    walletAddress
  } = context

  // Get CCTP transfer confirmation
  if (isDepositMode && onCctpDepositConfirmationNeeded) {
    const result = await onCctpDepositConfirmationNeeded()
    if (!result) {
      return {
        type: 'ERROR',
        context,
        error: new Error('User rejected CCTP deposit')
      }
    }
    if (result === 'bridge-normal-usdce') {
      // Switch to normal bridge flow
      return {
        type: 'CHECKING_APPROVALS',
        context: {
          ...context,
          isCctp: false
        }
      }
    }
  } else if (!isDepositMode && onCctpWithdrawalConfirmationNeeded) {
    const confirmed = await onCctpWithdrawalConfirmationNeeded()
    if (!confirmed) {
      return {
        type: 'ERROR',
        context,
        error: new Error('User rejected CCTP withdrawal')
      }
    }
  }

  // Get custom destination address confirmation if needed
  if (
    isSmartContractWallet &&
    destinationAddress?.toLowerCase() === walletAddress?.toLowerCase() &&
    onCustomDestinationAddressConfirmationNeeded
  ) {
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
    type: 'EXECUTING_CCTP_TRANSFER',
    context
  }
}

export const confirmTransfer = async (
  state: TransferState
): Promise<TransferState> => {
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

export const executeCctpTransfer = async (
  state: TransferState
): Promise<TransferState> => {
  const { context } = state
  const {
    amount,
    signer,
    destinationAddress,
    cctpTransferStarter,
    isSmartContractWallet,
    isDepositMode,
    onTrackEvent,
    onSmartContractWalletDelayNeeded
  } = context

  if (!cctpTransferStarter) {
    return {
      type: 'ERROR',
      context,
      error: new Error('CCTP transfer starter not initialized')
    }
  }

  // Show delay for smart contract wallets
  if (isSmartContractWallet && onSmartContractWalletDelayNeeded) {
    await onSmartContractWalletDelayNeeded()
  }

  // Track event before executing transfer
  if (onTrackEvent) {
    onTrackEvent(isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal', {
      accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
      amount: amount.toString(),
      complete: false,
      version: 2
    })
  }

  // Execute the transfer
  const transfer = await cctpTransferStarter.transfer({
    amount,
    signer,
    destinationAddress
  })

  return {
    type: 'SUCCESS',
    context,
    result: transfer
  }
}

export const executeTransfer = async (
  state: TransferState
): Promise<TransferState> => {
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

// State transition map
const stateTransitions: Record<TransferStateType, StateTransition | undefined> = {
  IDLE: validateTransfer,
  VALIDATING: validateTransfer,
  CHECKING_APPROVALS: checkApprovals,
  WAITING_FOR_NATIVE_CURRENCY_APPROVAL: handleNativeCurrencyApproval,
  WAITING_FOR_TOKEN_APPROVAL: handleTokenApproval,
  CONFIRMING_CCTP_TRANSFER: confirmCctpTransfer,
  CONFIRMING_TRANSFER: confirmTransfer,
  EXECUTING_CCTP_TRANSFER: executeCctpTransfer,
  EXECUTING_TRANSFER: executeTransfer,
  SUCCESS: undefined,
  ERROR: undefined
}

// Core state machine function
export const runTransferStateMachine = async (
  context: TransferContext
): Promise<TransferState> => {
  let currentState: TransferState = {
    type: 'VALIDATING',
    context
  }

  while (true) {
    const transition = stateTransitions[currentState.type]

    if (!transition) {
      return currentState
    }

    try {
      currentState = await transition(currentState)
    } catch (error) {
      return {
        type: 'ERROR',
        context,
        error: error as Error
      }
    }
  }
}
