import { BigNumber, Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { BridgeTransfer, TransferOverrides } from './BridgeTransferStarter'
import { BaseContext, BaseState, StateMachine } from './StateMachine'

export type BaseTransferContext = BaseContext & {
  amount: BigNumber
  signer: Signer
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  destinationAddress?: string
  isSmartContractWallet: boolean
  isTeleportMode: boolean
  isDepositMode: boolean
  walletAddress?: string
  sourceChainId: number
  destinationChainId: number
  // Common callbacks
  onSmartContractWalletDelayNeeded?: () => Promise<void>
  onCustomDestinationAddressConfirmationNeeded?: () => Promise<boolean>
  // Event tracking
  onTrackEvent?: (event: string, data: Record<string, unknown>) => void
}

export type BaseTransferStateType =
  | 'IDLE'
  | 'VALIDATING'
  | 'CHECKING_APPROVALS'
  | 'EXECUTING_TRANSFER'
  | 'SUCCESS'
  | 'ERROR'

export type BaseTransferState = BaseState<BaseTransferContext, BaseTransferStateType> & {
  result?: BridgeTransfer
}

// Common validation logic
export const validateBaseTransfer = async (
  state: BaseTransferState
): Promise<BaseTransferState> => {
  const { context } = state
  const {
    signer,
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

// Base state machine definition
export const createBaseTransferStateMachine = () => {
  return new StateMachine<
    BaseTransferContext,
    BaseTransferStateType,
    BaseTransferState
  >({
    initialState: 'VALIDATING',
    transitions: {
      IDLE: validateBaseTransfer,
      VALIDATING: validateBaseTransfer,
      SUCCESS: undefined,
      ERROR: undefined
    }
  })
} 