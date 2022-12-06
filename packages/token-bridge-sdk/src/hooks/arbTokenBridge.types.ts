import { Signer } from '@ethersproject/abstract-signer'
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { TokenList } from '@uniswap/token-lists'
import {
  L1ToL2MessageStatus,
  L2ToL1MessageStatus as OutgoingMessageState
} from '@arbitrum/sdk'
import {
  EthDepositMessage,
  L1ToL2MessageReader as IL1ToL2MessageReader
} from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'
import { ERC20 } from '@arbitrum/sdk/dist/lib/abi/ERC20'
import { StandardArbERC20 } from '@arbitrum/sdk/dist/lib/abi/StandardArbERC20'
import { WithdrawalInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L2ArbitrumGateway'
import { L2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/message/L2ToL1Message'
import { EventArgs } from '@arbitrum/sdk/dist/lib/dataEntities/event'

import {
  L1EthDepositTransaction,
  L1EthDepositTransactionReceipt,
  L1ContractCallTransaction,
  L1ContractCallTransactionReceipt
} from '@arbitrum/sdk/dist/lib/message/L1Transaction'
import {
  L2ContractTransaction,
  L2TransactionReceipt
} from '@arbitrum/sdk/dist/lib/message/L2Transaction'

import {
  FailedTransaction,
  NewTransaction,
  Transaction,
  L1ToL2MessageData
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
}>

export type L1EthDepositTransactionLifecycle = TransactionLifecycle<
  L1EthDepositTransaction,
  L1EthDepositTransactionReceipt
>

export type L1ContractCallTransactionLifecycle = TransactionLifecycle<
  L1ContractCallTransaction,
  L1ContractCallTransactionReceipt
>

export type L2ContractCallTransactionLifecycle = TransactionLifecycle<
  L2ContractTransaction,
  L2TransactionReceipt
>

export type NodeBlockDeadlineStatus =
  | number
  | 'NODE_NOT_CREATED'
  | 'EXECUTE_CALL_EXCEPTION'

export type L2ToL1EventResult = L2ToL1TransactionEvent

export type L2ToL1EventResultPlus = L2ToL1EventResult & {
  l2TxHash?: string
  type: AssetType
  value: BigNumber
  tokenAddress?: string
  outgoingMessageState: OutgoingMessageState
  symbol: string
  decimals: number
  nodeBlockDeadline?: NodeBlockDeadlineStatus
}

export type WithdrawalInitiated = EventArgs<WithdrawalInitiatedEvent> & {
  txHash: string
}

export interface PendingWithdrawalsMap {
  [id: string]: L2ToL1EventResultPlus
}
export interface BridgeToken {
  type: TokenType
  name: string
  symbol: string
  address: string
  l2Address?: string
  logoURI?: string
  listID?: number // no listID indicates added by user
}

export interface ERC20BridgeToken extends BridgeToken {
  type: TokenType.ERC20
  decimals: number
}

export interface L1TokenData {
  name: string
  symbol: string
  balance: BigNumber
  allowance: BigNumber
  decimals: number
  contract: ERC20
}

export interface L2TokenData {
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
  estimatedL1Gas: BigNumber
  estimatedL2Gas: BigNumber
}

export type DepositGasEstimates = GasEstimates & {
  estimatedL2SubmissionCost: BigNumber
}

export interface ArbTokenBridgeEth {
  deposit: (params: {
    amount: BigNumber
    l1Signer: Signer
    txLifecycle?: L1EthDepositTransactionLifecycle
  }) => Promise<void | ContractReceipt>
  depositEstimateGas: (params: {
    amount: BigNumber
  }) => Promise<DepositGasEstimates>
  withdraw: (params: {
    amount: BigNumber
    l2Signer: Signer
    txLifecycle?: L2ContractCallTransactionLifecycle
  }) => Promise<void | ContractReceipt>
  withdrawEstimateGas: (params: { amount: BigNumber }) => Promise<GasEstimates>
  triggerOutbox: (params: {
    id: string
    l1Signer: Signer
  }) => Promise<void | ContractReceipt>
}

export interface ArbTokenBridgeToken {
  add: (erc20L1orL2Address: string) => Promise<void>
  addTokensFromList: (tokenList: TokenList, listID?: number) => void
  removeTokensFromList: (listID: number) => void
  updateTokenData: (l1Address: string) => Promise<void>
  approve: (params: {
    erc20L1Address: string
    l1Signer: Signer
  }) => Promise<void>
  approveEstimateGas: (params: { erc20L1Address: string }) => Promise<BigNumber>
  approveL2: (params: {
    erc20L1Address: string
    l2Signer: Signer
  }) => Promise<void>
  deposit: (params: {
    erc20L1Address: string
    amount: BigNumber
    l1Signer: Signer
    txLifecycle?: L1ContractCallTransactionLifecycle
    destinationAddress?: string
  }) => Promise<void | ContractReceipt>
  depositEstimateGas: (params: {
    erc20L1Address: string
    amount: BigNumber
  }) => Promise<DepositGasEstimates>
  withdraw: (params: {
    erc20L1Address: string
    amount: BigNumber
    l2Signer: Signer
    txLifecycle?: L2ContractCallTransactionLifecycle
    destinationAddress?: string
  }) => Promise<void | ContractReceipt>
  withdrawEstimateGas: (params: {
    amount: BigNumber
    erc20L1Address: string
  }) => Promise<GasEstimates>
  triggerOutbox: (params: {
    id: string
    l1Signer: Signer
  }) => Promise<void | ContractReceipt>
  getL2ERC20Address: (erc20L1Address: string) => Promise<string>
  getL2GatewayAddress: (erc20L1Address: string) => Promise<string>
}

export interface TransactionActions {
  addFailedTransaction: (transaction: FailedTransaction) => void
  setTransactionSuccess: (txID: string) => void
  setTransactionFailure: (txID?: string) => void
  removeTransaction: (txID: string) => void

  addTransaction: (transaction: NewTransaction) => void
  addTransactions: (transactions: Transaction[]) => void
  clearPendingTransactions: () => void
  setTransactionConfirmed: (txID: string) => void
  updateTransaction: (
    txReceipt: TransactionReceipt,
    tx?: ethers.ContractTransaction,
    l1ToL2MsgData?: L1ToL2MessageData
  ) => void
  fetchAndUpdateL1ToL2MsgStatus: (
    txID: string,
    l1ToL2Msg: IL1ToL2MessageReader,
    isEthDeposit: boolean,
    status: L1ToL2MessageStatus
  ) => void
  fetchAndUpdateEthDepositMessageStatus: (
    txID: string,
    ethDepositMessage: EthDepositMessage
  ) => void
}

export type ArbTokenBridgeTransactions = {
  transactions: Transaction[]
} & Pick<
  TransactionActions,
  | 'addTransaction'
  | 'clearPendingTransactions'
  | 'setTransactionConfirmed'
  | 'updateTransaction'
  | 'addTransactions'
  | 'fetchAndUpdateL1ToL2MsgStatus'
  | 'fetchAndUpdateEthDepositMessageStatus'
>

export interface ArbTokenBridge {
  walletAddress: string
  bridgeTokens: ContractStorage<ERC20BridgeToken> | undefined
  eth: ArbTokenBridgeEth
  token: ArbTokenBridgeToken
  transactions: ArbTokenBridgeTransactions
  pendingWithdrawalsMap: PendingWithdrawalsMap
  setInitialPendingWithdrawals: (gatewayAddresses: string[]) => Promise<void>
}
