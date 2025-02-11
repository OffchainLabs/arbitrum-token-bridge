import { BigNumber, Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { BridgeTransfer, TransferOverrides } from './BridgeTransferStarter'
import { BridgeTransferStarterFactory } from './BridgeTransferStarterFactory'
import { getBridgeTransferProperties } from './utils'
import { isGatewayRegistered } from '../util/TokenUtils'

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
  // Callbacks for UI interactions
  onTokenApprovalNeeded?: () => Promise<boolean>
  onNativeCurrencyApprovalNeeded?: () => Promise<boolean>
  onWithdrawalConfirmationNeeded?: () => Promise<boolean>
  onCustomDestinationAddressConfirmationNeeded?: () => Promise<boolean>
  onFirstTimeTokenBridgingConfirmationNeeded?: () => Promise<boolean>
  onSmartContractWalletDelayNeeded?: () => Promise<void>
}

export type TransferStateType =
  | 'IDLE'
  | 'VALIDATING'
  | 'CHECKING_APPROVALS'
  | 'WAITING_FOR_NATIVE_CURRENCY_APPROVAL'
  | 'WAITING_FOR_TOKEN_APPROVAL'
  | 'CONFIRMING_TRANSFER'
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
    destinationAddress
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
    context
  }
}

export const checkApprovals = async (
  state: TransferState
): Promise<TransferState> => {
  const { context } = state
  const {
    amount,
    signer,
    sourceChainId,
    destinationChainId,
    sourceChainErc20Address,
    destinationChainErc20Address,
    destinationAddress,
    selectedToken,
    isDepositMode,
    sourceChainProvider,
    destinationChainProvider
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

  // Check native currency approval
  const isNativeCurrencyApprovalRequired =
    await bridgeTransferStarter.requiresNativeCurrencyApproval({
      signer,
      amount,
      destinationAddress
    })

  if (isNativeCurrencyApprovalRequired) {
    return {
      type: 'WAITING_FOR_NATIVE_CURRENCY_APPROVAL',
      context: {
        ...context,
        bridgeTransferStarter
      }
    }
  }

  // Check token approval
  if (selectedToken) {
    const isTokenApprovalRequired =
      await bridgeTransferStarter.requiresTokenApproval({
        amount,
        signer,
        destinationAddress
      })

    if (isTokenApprovalRequired) {
      return {
        type: 'WAITING_FOR_TOKEN_APPROVAL',
        context: {
          ...context,
          bridgeTransferStarter
        }
      }
    }
  }

  return {
    type: 'CONFIRMING_TRANSFER',
    context: {
      ...context,
      bridgeTransferStarter
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

  // Execute approval
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

export const executeTransfer = async (
  state: TransferState
): Promise<TransferState> => {
  const { context } = state
  const {
    amount,
    signer,
    destinationAddress,
    bridgeTransferStarter,
    overrides
  } = context

  if (!bridgeTransferStarter) {
    return {
      type: 'ERROR',
      context,
      error: new Error('Bridge transfer starter not initialized')
    }
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
const stateTransitions: Record<TransferStateType, StateTransition | undefined> =
  {
    IDLE: validateTransfer,
    VALIDATING: validateTransfer,
    CHECKING_APPROVALS: checkApprovals,
    WAITING_FOR_NATIVE_CURRENCY_APPROVAL: handleNativeCurrencyApproval,
    WAITING_FOR_TOKEN_APPROVAL: handleTokenApproval,
    CONFIRMING_TRANSFER: confirmTransfer,
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
