import { TransactionReceipt } from '@ethersproject/abstract-provider'
import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { TokenList } from '@uniswap/token-lists'
import { L1ToL2MessageReader, L1ToL2MessageStatus } from '@arbitrum/sdk'
import { ERC20 } from '@arbitrum/sdk/dist/lib/abi/ERC20'
import { StandardArbERC20 } from '@arbitrum/sdk/dist/lib/abi/StandardArbERC20'

import {
  FailedTransaction,
  NewTransaction,
  Transaction
} from './useTransactions'

export type NodeBlockDeadlineStatus = number | 'NODE_NOT_CREATED'

export enum OutgoingMessageState {
  /**
   * No corresponding {@link L2ToL1EventResult} emitted
   */
  NOT_FOUND = 0,
  /**
   * ArbSys.sendTxToL1 called, but assertion not yet confirmed
   */
  UNCONFIRMED = 1,
  /**
   * Assertion for outgoing message confirmed, but message not yet executed
   */
  CONFIRMED = 2,
  /**
   * Outgoing message executed (terminal state)
   */
  EXECUTED = 3
}

export interface L2ToL1EventResult {
  caller: string
  destination: string
  uniqueId: BigNumber
  batchNumber: BigNumber
  indexInBatch: BigNumber
  arbBlockNum: BigNumber
  ethBlockNum: BigNumber
  timestamp: BigNumber | string // TODO: Clean up
  callvalue: BigNumber
  data: string
}

export interface L2ToL1EventResultPlus extends L2ToL1EventResult {
  type: AssetType
  value: BigNumber
  tokenAddress?: string
  outgoingMessageState: OutgoingMessageState
  symbol: string
  decimals: number
  nodeBlockDeadline?: NodeBlockDeadlineStatus
}

export interface WithdrawalInitiated {
  l1Token: string
  _from: string
  _to: string
  _l2ToL1Id: BigNumber
  _exitNum: BigNumber
  _amount: BigNumber
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

export enum TokenType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721'
}
/* eslint-enable no-shadow */

export enum AssetType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ETH = 'ETH'
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

export interface ArbTokenBridgeEth {
  deposit: (weiValue: BigNumber) => Promise<void | ContractReceipt>
  withdraw: (weiValue: BigNumber) => Promise<void | ContractReceipt>
  triggerOutbox: (id: string) => Promise<void | ContractReceipt>
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
  approve: (erc20L1Address: string) => Promise<void>
  deposit: (
    erc20Address: string,
    amount: BigNumber
  ) => Promise<void | ContractReceipt>
  withdraw: (
    erc20l1Address: string,
    amount: BigNumber
  ) => Promise<void | ContractReceipt>
  triggerOutbox: (id: string) => Promise<void | ContractReceipt>
  getL1TokenData: (erc20L1Address: string) => Promise<L1TokenData>
  getL2TokenData: (erc20L2Address: string) => Promise<L2TokenData>
  getL1ERC20Address: (erc20L2Address: string) => Promise<string | null>
  getL2ERC20Address: (erc20L1Address: string) => Promise<string>
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
    seqNum?: number
  ) => void
  updateL1ToL2MsgData: (
    txID: string,
    l1ToL2Msg: L1ToL2MessageReader,
    status?: L1ToL2MessageStatus
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
  | 'updateL1ToL2MsgData'
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
  setInitialPendingWithdrawals: (
    gatewayAddresses: string[],
    filter?: ethers.providers.Filter
  ) => Promise<void>
}
