import { Signer } from '@ethersproject/abstract-signer'
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { TokenList } from '@uniswap/token-lists'
import { ChildToParentMessageStatus as OutgoingMessageState } from '@arbitrum/sdk'
import { StandardArbERC20 } from '@arbitrum/sdk/dist/lib/abi/StandardArbERC20'
import { WithdrawalInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L2ArbitrumGateway'
import { ChildToParentTransactionEvent } from '@arbitrum/sdk/dist/lib/message/ChildToParentMessage'
import { EventArgs } from '@arbitrum/sdk/dist/lib/dataEntities/event'

import {
  ParentEthDepositTransaction,
  ParentEthDepositTransactionReceipt,
  ParentContractCallTransaction,
  ParentContractCallTransactionReceipt
} from '@arbitrum/sdk/dist/lib/message/ParentTransaction'
import {
  ChildContractTransaction,
  ChildTransactionReceipt
} from '@arbitrum/sdk/dist/lib/message/ChildTransaction'

import {
  NewTransaction,
  Transaction,
  ParentToChildMessageData
} from './useTransactions'

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

export type ParentEthDepositTransactionLifecycle = TransactionLifecycle<
  ParentEthDepositTransaction,
  ParentEthDepositTransactionReceipt
>

export type ParentContractCallTransactionLifecycle = TransactionLifecycle<
  ParentContractCallTransaction,
  ParentContractCallTransactionReceipt
>

export type ChildContractCallTransactionLifecycle = TransactionLifecycle<
  ChildContractTransaction,
  ChildTransactionReceipt
>

export enum NodeBlockDeadlineStatusTypes {
  NODE_NOT_CREATED,
  EXECUTE_CALL_EXCEPTION
}

export type NodeBlockDeadlineStatus =
  | number
  | NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED
  | NodeBlockDeadlineStatusTypes.EXECUTE_CALL_EXCEPTION

export type ChildToParentEventResult = ChildToParentTransactionEvent

export type ChildToParentEventResultPlus = ChildToParentEventResult & {
  sender?: string
  destinationAddress?: string
  childTxHash?: string
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
  childAddress?: string
  logoURI?: string
  listIds: Set<number> // no listID indicates added by user
  isL2Native?: boolean
}

export interface ERC20BridgeToken extends BridgeToken {
  type: TokenType.ERC20
  decimals: number
}

export interface ChildTokenData {
  balance: BigNumber
  contract: StandardArbERC20
}

export interface ContractStorage<T> {
  [contractAddress: string]: T | undefined
}
export interface BridgeBalance {
  balance: BigNumber | null

  arbChainBalance: BigNumber | null
}

// removing 'tokens' / 'balance' could result in one interface
export interface AddressToSymbol {
  [tokenAddress: string]: string
}
export interface AddressToDecimals {
  [tokenAddress: string]: number
}

export type GasEstimates = {
  estimatedParentChainGas: BigNumber
  estimatedChildChainGas: BigNumber
}

export type DepositGasEstimates = GasEstimates & {
  estimatedChildChainSubmissionCost: BigNumber
}

export interface ArbTokenBridgeEth {
  deposit: (params: {
    amount: BigNumber
    parentSigner: Signer
    txLifecycle?: ParentEthDepositTransactionLifecycle
  }) => Promise<void | ContractReceipt>
  withdraw: (params: {
    amount: BigNumber
    childSigner: Signer
    txLifecycle?: ChildContractCallTransactionLifecycle
  }) => Promise<void | ContractReceipt>
  triggerOutbox: (params: {
    event: ChildToParentEventResultPlus
    parentSigner: Signer
  }) => Promise<void | ContractReceipt>
}

export interface ArbTokenBridgeToken {
  add: (erc20ParentOrChildAddress: string) => Promise<void>
  addL2NativeToken: (erc20L2Address: string) => void
  addTokensFromList: (tokenList: TokenList, listID: number) => void
  removeTokensFromList: (listID: number) => void
  updateTokenData: (parentAddress: string) => Promise<void>
  approve: (params: {
    erc20ParentAddress: string
    parentSigner: Signer
  }) => Promise<void>
  approveChild: (params: {
    erc20ParentAddress: string
    childSigner: Signer
  }) => Promise<void>
  deposit: (params: {
    erc20ParentAddress: string
    amount: BigNumber
    parentSigner: Signer
    txLifecycle?: ParentContractCallTransactionLifecycle
    destinationAddress?: string
  }) => Promise<void | ContractReceipt>
  withdraw: (params: {
    erc20ParentAddress: string
    amount: BigNumber
    childSigner: Signer
    txLifecycle?: ChildContractCallTransactionLifecycle
    destinationAddress?: string
  }) => Promise<void | ContractReceipt>
  triggerOutbox: (params: {
    event: ChildToParentEventResultPlus
    parentSigner: Signer
  }) => Promise<void | ContractReceipt>
}

export interface TransactionActions {
  addTransaction: (transaction: NewTransaction) => void
  updateTransaction: (
    txReceipt: TransactionReceipt,
    tx?: ethers.ContractTransaction,
    parentToChildMsgData?: ParentToChildMessageData
  ) => void
}

export type ArbTokenBridgeTransactions = {
  transactions: Transaction[]
} & Pick<TransactionActions, 'addTransaction' | 'updateTransaction'>

export interface ArbTokenBridge {
  bridgeTokens: ContractStorage<ERC20BridgeToken> | undefined
  eth: ArbTokenBridgeEth
  token: ArbTokenBridgeToken
  transactions: ArbTokenBridgeTransactions
}
