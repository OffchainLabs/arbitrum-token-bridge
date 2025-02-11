import { CctpTransferStarter } from './CctpTransferStarter'
import {
  DefaultTransferContext,
  DefaultTransferState,
  DefaultTransferStateType,
  validateDefaultTransfer
} from './DefaultTransferStateMachine'
import { StateMachine } from './StateMachine'

export type CctpTransferContext = DefaultTransferContext & {
  cctpTransferStarter?: CctpTransferStarter
  onCctpDepositConfirmationNeeded?: () => Promise<
    'bridge-cctp-usd' | 'bridge-normal-usdce' | false
  >
  onCctpWithdrawalConfirmationNeeded?: () => Promise<boolean>
  onTokenApprovalNeeded?: () => Promise<boolean>
}

export type CctpTransferStateType =
  | DefaultTransferStateType
  | 'WAITING_FOR_TOKEN_APPROVAL'
  | 'CONFIRMING_CCTP_TRANSFER'
  | 'EXECUTING_CCTP_TRANSFER'

export type CctpTransferState = DefaultTransferState & {
  type: CctpTransferStateType
  context: CctpTransferContext
}

// CCTP-specific state transitions
export const checkCctpApprovals = async (
  state: CctpTransferState
): Promise<CctpTransferState> => {
  const { context } = state
  const { amount, signer } = context

  // Initialize CCTP transfer starter if not already done
  const cctpTransferStarter =
    context.cctpTransferStarter ??
    new CctpTransferStarter({
      sourceChainProvider: context.sourceChainProvider,
      destinationChainProvider: context.destinationChainProvider
    })

  const isTokenApprovalRequired =
    await cctpTransferStarter.requiresTokenApproval({
      amount,
      signer
    })

  if (isTokenApprovalRequired) {
    return {
      type: 'WAITING_FOR_TOKEN_APPROVAL',
      context: {
        ...context,
        cctpTransferStarter
      }
    }
  }

  return {
    type: 'CONFIRMING_CCTP_TRANSFER',
    context: {
      ...context,
      cctpTransferStarter
    }
  }
}

export const handleCctpTokenApproval = async (
  state: CctpTransferState
): Promise<CctpTransferState> => {
  const { context } = state
  const {
    amount,
    signer,
    onTokenApprovalNeeded,
    isSmartContractWallet,
    onSmartContractWalletDelayNeeded,
    cctpTransferStarter
  } = context

  if (!cctpTransferStarter) {
    return {
      type: 'ERROR',
      context,
      error: new Error('CCTP transfer starter not initialized')
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

export const confirmCctpTransfer = async (
  state: CctpTransferState
): Promise<CctpTransferState> => {
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
      // Switch to normal bridge flow - this should be handled by the parent
      return {
        type: 'ERROR',
        context,
        error: new Error('User selected normal bridge')
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

export const executeCctpTransfer = async (
  state: CctpTransferState
): Promise<CctpTransferState> => {
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

// Create CCTP state machine
export const createCctpTransferStateMachine = () => {
  return new StateMachine<
    CctpTransferContext,
    CctpTransferStateType,
    CctpTransferState
  >({
    initialState: 'VALIDATING',
    transitions: {
      IDLE: validateDefaultTransfer,
      VALIDATING: validateDefaultTransfer,
      CHECKING_APPROVALS: checkCctpApprovals,
      WAITING_FOR_TOKEN_APPROVAL: handleCctpTokenApproval,
      CONFIRMING_CCTP_TRANSFER: confirmCctpTransfer,
      EXECUTING_CCTP_TRANSFER: executeCctpTransfer,
      SUCCESS: undefined,
      ERROR: undefined
    }
  })
}
