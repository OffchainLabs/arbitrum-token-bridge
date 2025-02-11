import { BigNumber, Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { BridgeTransfer } from './BridgeTransferStarter'
import { DefaultContext, DefaultState, StateMachine } from './StateMachine'
import { isAddress } from 'ethers/lib/utils'

export type DefaultTransferContext = {
  amount: BigNumber
  amount2?: BigNumber
  signer: Signer
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  destinationAddress?: string
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  isSmartContractWallet: boolean
  isTeleportMode: boolean
  isDepositMode: boolean
  isCctp?: boolean
  isOftTransfer?: boolean
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
  // Callbacks for UI interactions
  onTokenApprovalNeeded?: () => Promise<boolean>
  onNativeCurrencyApprovalNeeded?: () => Promise<boolean>
  onWithdrawalConfirmationNeeded?: () => Promise<boolean>
  onCustomDestinationAddressConfirmationNeeded?: () => Promise<boolean>
  onFirstTimeTokenBridgingConfirmationNeeded?: () => Promise<boolean>
  onSmartContractWalletDelayNeeded?: () => Promise<void>
  onCctpDepositConfirmationNeeded?: () => Promise<'bridge-normal-usdce' | 'bridge-cctp-usd' | false>
  onCctpWithdrawalConfirmationNeeded?: () => Promise<boolean>
  onTrackEvent?: (event: string, data: Record<string, unknown>) => void
}

export type DefaultTransferStateType =
  | 'IDLE'
  | 'VALIDATING'
  | 'CHECKING_APPROVALS'
  | 'EXECUTING_TRANSFER'
  | 'SUCCESS'
  | 'ERROR'

export type DefaultTransferState = DefaultState<DefaultTransferContext, DefaultTransferStateType> & {
  result?: BridgeTransfer
}

// Common validation logic
export const validateDefaultTransfer = async (
  state: DefaultTransferState
): Promise<DefaultTransferState> => {
  const { context } = state
  const { signer, isSmartContractWallet, isTeleportMode, destinationAddress } = context

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

// Default state machine definition
export const createDefaultTransferStateMachine = () => {
  return new StateMachine<
    DefaultTransferContext,
    DefaultTransferStateType,
    DefaultTransferState
  >({
    initialState: 'VALIDATING',
    transitions: {
      IDLE: validateDefaultTransfer,
      VALIDATING: validateDefaultTransfer,
      SUCCESS: undefined,
      ERROR: undefined
    }
  })
} 