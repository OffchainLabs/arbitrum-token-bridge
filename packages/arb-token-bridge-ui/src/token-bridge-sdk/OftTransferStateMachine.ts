import { OftV2TransferStarter } from './OftV2TransferStarter'
import {
  DefaultTransferContext,
  DefaultTransferState,
  DefaultTransferStateType,
  validateDefaultTransfer
} from './DefaultTransferStateMachine'
import { StateMachine } from './StateMachine'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { captureSentryErrorWithExtraData } from '../util/SentryUtils'

export type OftTransferContext = DefaultTransferContext & {
  oftTransferStarter?: OftV2TransferStarter
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  selectedToken?: {
    address: string
    symbol: string
    l2Address?: string
  }
  // Callbacks
  onTokenApprovalNeeded?: () => Promise<boolean>
  onHighlightOftTransactionHistoryDisclaimer?: () => void
  onSwitchToTransactionHistoryTab?: () => void
  onClearAmountInput?: () => void
}

export type OftTransferStateType =
  | DefaultTransferStateType
  | 'WAITING_FOR_TOKEN_APPROVAL'
  | 'CONFIRMING_TRANSFER'

export type OftTransferState = DefaultTransferState & {
  type: OftTransferStateType
  context: OftTransferContext
}

// OFT-specific state transitions
export const checkOftApprovals = async (
  state: OftTransferState
): Promise<OftTransferState> => {
  const { context } = state
  const {
    amount,
    signer,
    sourceChainProvider,
    destinationChainProvider,
    sourceChainErc20Address,
    selectedToken
  } = context

  if (!selectedToken) {
    return {
      type: 'ERROR',
      context,
      error: new Error('No token selected')
    }
  }

  // Initialize OFT transfer starter
  const oftTransferStarter = new OftV2TransferStarter({
    sourceChainProvider,
    sourceChainErc20Address: sourceChainErc20Address ?? selectedToken.address,
    destinationChainProvider
  })

  // Check token approval
  const isTokenApprovalRequired = await oftTransferStarter.requiresTokenApproval({
    amount,
    signer
  })

  if (isTokenApprovalRequired) {
    return {
      type: 'WAITING_FOR_TOKEN_APPROVAL',
      context: {
        ...context,
        oftTransferStarter
      }
    }
  }

  return {
    type: 'CONFIRMING_TRANSFER',
    context: {
      ...context,
      oftTransferStarter
    }
  }
}

export const handleOftTokenApproval = async (
  state: OftTransferState
): Promise<OftTransferState> => {
  const { context } = state
  const {
    amount,
    signer,
    onTokenApprovalNeeded,
    isSmartContractWallet,
    onSmartContractWalletDelayNeeded,
    oftTransferStarter
  } = context

  if (!oftTransferStarter) {
    return {
      type: 'ERROR',
      context,
      error: new Error('OFT transfer starter not initialized')
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

  try {
    const approvalTx = await oftTransferStarter.approveToken({
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
  } catch (error) {
    if (isUserRejectedError(error)) {
      return {
        type: 'ERROR',
        context,
        error: new Error('User rejected transaction')
      }
    }
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'oftTransferStarter.approveToken'
    })
    throw error
  }
}

export const executeOftTransfer = async (
  state: OftTransferState
): Promise<OftTransferState> => {
  const { context } = state
  const {
    amount,
    signer,
    destinationAddress,
    oftTransferStarter,
    isSmartContractWallet,
    isDepositMode,
    selectedToken,
    onTrackEvent,
    onSmartContractWalletDelayNeeded,
    onSwitchToTransactionHistoryTab,
    onClearAmountInput,
    onHighlightOftTransactionHistoryDisclaimer
  } = context

  if (!oftTransferStarter) {
    return {
      type: 'ERROR',
      context,
      error: new Error('OFT transfer starter not initialized')
    }
  }

  // Show delay for smart contract wallets
  if (isSmartContractWallet && onSmartContractWalletDelayNeeded) {
    await onSmartContractWalletDelayNeeded()
  }

  try {
    // Track event before executing transfer
    if (onTrackEvent && selectedToken) {
      onTrackEvent('OFT Transfer', {
        tokenSymbol: selectedToken.symbol,
        assetType: 'ERC-20',
        accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
        amount: amount.toString(),
        isCustomDestinationTransfer: !!destinationAddress
      })
    }

    // Execute the transfer
    const transfer = await oftTransferStarter.transfer({
      amount,
      signer,
      destinationAddress
    })

    // Handle UI updates
    if (onSwitchToTransactionHistoryTab) {
      onSwitchToTransactionHistoryTab()
    }
    if (onClearAmountInput) {
      onClearAmountInput()
    }
    if (onHighlightOftTransactionHistoryDisclaimer) {
      setTimeout(onHighlightOftTransactionHistoryDisclaimer, 100)
    }

    return {
      type: 'SUCCESS',
      context,
      result: transfer
    }
  } catch (error) {
    if (isUserRejectedError(error)) {
      return {
        type: 'ERROR',
        context,
        error: new Error('User rejected transaction')
      }
    }
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'oftTransferStarter.transfer',
      additionalData: selectedToken
        ? {
            erc20_address_on_parent_chain: selectedToken.address,
            transfer_type: 'token'
          }
        : { transfer_type: 'native currency' }
    })
    throw error
  }
}

// Create OFT state machine
export const createOftTransferStateMachine = () => {
  return new StateMachine<OftTransferContext, OftTransferStateType, OftTransferState>({
    initialState: 'VALIDATING',
    transitions: {
      IDLE: validateDefaultTransfer,
      VALIDATING: validateDefaultTransfer,
      CHECKING_APPROVALS: checkOftApprovals,
      WAITING_FOR_TOKEN_APPROVAL: handleOftTokenApproval,
      CONFIRMING_TRANSFER: executeOftTransfer,
      EXECUTING_TRANSFER: executeOftTransfer,
      SUCCESS: undefined,
      ERROR: undefined
    }
  })
} 