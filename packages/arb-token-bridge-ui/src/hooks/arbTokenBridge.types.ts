import {
  ChildToParentMessageStatus as OutgoingMessageState,
  ChildToParentTransactionEvent,
  EventArgs
} from '@arbitrum/sdk'
import { WithdrawalInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L2ArbitrumGateway'
import { Signer } from '@ethersproject/abstract-signer'
import { TokenList } from '@uniswap/token-lists'
import { BigNumber, ContractReceipt } from 'ethers'

export { OutgoingMessageState }

export enum TokenType {
  ERC20 = 'ERC20'
}

export enum AssetType {
  ERC20 = 'ERC20',
  ETH = 'ETH'
}

export type TransactionLifecycle<Tx, TxReceipt> = Partial<{
  onTxSubmit: (tx: Tx) => void
  onTxConfirm: (txReceipt: TxReceipt) => void
  onTxError: (error: any) => void
}>

export enum NodeBlockDeadlineStatusTypes {
  NODE_NOT_CREATED,
  EXECUTE_CALL_EXCEPTION
}

export type NodeBlockDeadlineStatus =
  | number
  | NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED
  | NodeBlockDeadlineStatusTypes.EXECUTE_CALL_EXCEPTION

export type L2ToL1EventResult = ChildToParentTransactionEvent

export type L2ToL1EventResultPlus = L2ToL1EventResult & {
  sender?: string
  destinationAddress?: string
  l2TxHash?: string
  type: AssetType
  value: BigNumber
  tokenAddress?: string
  outgoingMessageState: OutgoingMessageState
  symbol: string
  decimals: number
  nodeBlockDeadline?: NodeBlockDeadlineStatus
  parentChainId: number
  childChainId: number
}

export type WithdrawalInitiated = EventArgs<WithdrawalInitiatedEvent> & {
  txHash: string
  timestamp?: BigNumber
  direction: 'deposit' | 'withdrawal'
  source: 'subgraph' | 'event_logs' | 'local_storage_cache'
  parentChainId: number
  childChainId: number
}

export interface BridgeToken {
  type: TokenType
  name: string
  symbol: string
  address: string
  l2Address?: string
  logoURI?: string
  listIds: Set<string> // no listID indicates added by user
  isL2Native?: boolean
}

export interface ERC20BridgeToken extends BridgeToken {
  type: TokenType.ERC20
  decimals: number
}

export interface ContractStorage<T> {
  [contractAddress: string]: T | undefined
}

export type GasEstimates = {
  estimatedParentChainGas: BigNumber
  estimatedChildChainGas: BigNumber
  isError?: boolean
}

export type DepositGasEstimates = GasEstimates & {
  estimatedChildChainSubmissionCost: BigNumber
}

export interface ArbTokenBridgeEth {
  triggerOutbox: (params: {
    event: L2ToL1EventResultPlus
    l1Signer: Signer
  }) => Promise<void | ContractReceipt>
}

export interface ArbTokenBridgeToken {
  add: (erc20L1orL2Address: string) => Promise<void>
  addL2NativeToken: (erc20L2Address: string) => void
  addTokensFromList: (tokenList: TokenList, listID: string) => void
  removeTokensFromList: (listID: string) => void
  updateTokenData: (l1Address: string) => Promise<void>
  triggerOutbox: (params: {
    event: L2ToL1EventResultPlus
    l1Signer: Signer
  }) => Promise<void | ContractReceipt>
}

export interface ArbTokenBridge {
  bridgeTokens: ContractStorage<ERC20BridgeToken> | undefined
  eth: ArbTokenBridgeEth
  token: ArbTokenBridgeToken
}
