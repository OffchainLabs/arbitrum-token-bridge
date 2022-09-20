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
  IL1ToL2MessageReader
} from '@arbitrum/sdk/dist/lib/utils/migration_types'
import {
  EthDepositParams,
  L1ToL2TxReqAndSigner
} from '@arbitrum/sdk/dist/lib/assetBridger/ethBridger'
import { ERC20 } from '@arbitrum/sdk/dist/lib/abi/ERC20'
import { StandardArbERC20 } from '@arbitrum/sdk/dist/lib/abi/StandardArbERC20'
import { WithdrawalInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L2ArbitrumGateway'
import { L2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/message/L2ToL1Message'

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
  ERC20 = 'ERC20',
  ERC721 = 'ERC721'
}

export enum AssetType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
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

export type WithdrawalInitiated = WithdrawalInitiatedEvent['args'] & {
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
/**
 * Holds balance values for ERC721 Token.
 * @name ERC721Balance
 * @alias ERC721Balance
 */
export interface ERC721Balance {
  /**
   * User's NFT balance on L1
   */
  ethBalance: BigNumber
  arbBalance: BigNumber

  tokens: BigNumber[]
  /**
   *  User's NFTs on Arbitrum
   */
  arbChainTokens: BigNumber[]
  /**
   * All NFTs on Arbitrum
   */
  totalArbTokens: BigNumber[]
  /**
   * All of user's NFTs available in lockbox (ready to transfer out.)
   */
  lockBoxTokens: BigNumber[]
}

export interface AddressToSymbol {
  [tokenAddress: string]: string
}
export interface AddressToDecimals {
  [tokenAddress: string]: number
}
export interface ArbTokenBridgeBalances {
  eth: BridgeBalance
  erc20: ContractStorage<BridgeBalance>
  erc721: ContractStorage<ERC721Balance>
}

export type GasEstimates = {
  estimatedL1Gas: BigNumber
  estimatedL2Gas: BigNumber
}

export type DepositGasEstimates = GasEstimates & {
  estimatedL2SubmissionCost: BigNumber
}

export interface ArbTokenBridgeEth {
  deposit: ({
    params,
    l1Tol2TxReq,
    txLifecycle
  }: {
    params: EthDepositParams
    l1Tol2TxReq: L1ToL2TxReqAndSigner
    txLifecycle?: L1EthDepositTransactionLifecycle
  }) => Promise<void | ContractReceipt>
  // TODO: remove; replace with provider.estimateGas
  depositEstimateGas: (params: {
    amount: BigNumber
    l1Signer: Signer
  }) => Promise<DepositGasEstimates>
  withdraw: (params: {
    amount: BigNumber
    l2Signer: Signer
    destinationAddress: string
    txLifecycle?: L2ContractCallTransactionLifecycle
  }) => Promise<void | ContractReceipt>
  withdrawEstimateGas: (params: {
    amount: BigNumber
    l2Signer: Signer
  }) => Promise<GasEstimates>
  triggerOutbox: (params: {
    id: string
    l1Signer: Signer
  }) => Promise<void | ContractReceipt>
  updateBalances: () => Promise<void>
}

export interface ArbTokenBridgeCache {
  erc20: string[]
  erc721: string[]
  expire: () => void
}

export interface ArbTokenBridgeToken {
  add: (erc20L1orL2Address: string) => Promise<string>
  addTokensFromList: (tokenList: TokenList, listID?: number) => void
  removeTokensFromList: (listID: number) => void
  updateTokenData: (l1Address: string) => Promise<void>
  approve: (params: {
    erc20L1Address: string
    l1Signer: Signer
  }) => Promise<void>
  approveEstimateGas: (params: { erc20L1Address: string }) => Promise<BigNumber>
  approveL2: (params: { erc20L1Address: string }) => Promise<void>
  deposit: (params: {
    erc20L1Address: string
    amount: BigNumber
    l1Signer: Signer
    txLifecycle?: L1ContractCallTransactionLifecycle
  }) => Promise<void | ContractReceipt>
  depositEstimateGas: (params: {
    erc20L1Address: string
    amount: BigNumber
    l1Signer: Signer
  }) => Promise<DepositGasEstimates>
  withdraw: (params: {
    erc20L1Address: string
    amount: BigNumber
    l2Signer: Signer
    txLifecycle?: L2ContractCallTransactionLifecycle
  }) => Promise<void | ContractReceipt>
  withdrawEstimateGas: (params: {
    erc20L1Address: string
    amount: BigNumber
    l2Signer: Signer
  }) => Promise<GasEstimates>
  triggerOutbox: (params: {
    id: string
    l1Signer: Signer
  }) => Promise<void | ContractReceipt>
  getL1TokenData: (erc20L1Address: string) => Promise<L1TokenData>
  getL2TokenData: (erc20L2Address: string) => Promise<L2TokenData>
  getL1ERC20Address: (erc20L2Address: string) => Promise<string | null>
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
  bridgeTokens: ContractStorage<ERC20BridgeToken>
  balances: ArbTokenBridgeBalances
  cache: ArbTokenBridgeCache
  eth: ArbTokenBridgeEth
  token: ArbTokenBridgeToken
  transactions: ArbTokenBridgeTransactions
  pendingWithdrawalsMap: PendingWithdrawalsMap
  setInitialPendingWithdrawals: (gatewayAddresses: string[]) => Promise<void>
}
