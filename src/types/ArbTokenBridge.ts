import {
  BridgeBalance,
  BridgeToken,
  ContractStorage,
  NewTransaction,
  PendingWithdrawalsMap,
  TokenType,
  Transaction
} from 'token-bridge-sdk'
import { TransactionReceipt } from '@ethersproject/providers'
import { Signer } from 'ethers'

export interface ArbTokenBridgeBalances {
  eth: BridgeBalance
  erc20: BridgeBalance
  erc721: BridgeBalance
  update: () => void
}

export interface ArbTokenBridgeEth {
  deposit: (etherVal: string) => Promise<void | TransactionReceipt>
  withdraw: (etherVal: string) => Promise<void | TransactionReceipt>
  triggerOutbox: (id: string) => Promise<void | TransactionReceipt>
  updateBalances: () => Promise<void>
}

export interface ArbTokenBridgeCache {
  erc20: string[]
  erc721: string[]
  expire: () => void
}

export interface ArbTokenBridgeToken {
  add: (erc20L1orL2Address: string, type: TokenType) => Promise<string>
  approve: (erc20L1Address: string) => Promise<void>
  deposit: (
    erc20Address: string,
    amount: string
  ) => Promise<void | TransactionReceipt>
  withdraw: (
    erc20l1Address: string,
    amount: string
  ) => Promise<void | TransactionReceipt>
  triggerOutbox: (id: string) => Promise<void | TransactionReceipt>
  updateBalances: Promise<() => void>
}

export interface ArbTokenBridgeTransactions {
  transactions: Transaction[]
  clearPendingTransactions: () => void
  setTransactionConfirmed: (txId: string) => void
  updateTransactionStatus: (txReceipt: TransactionReceipt) => void
  addTransaction: (transaction: NewTransaction) => void
}

export interface ArbTokenBridge {
  walletAddress: string
  bridgeTokens: ContractStorage<BridgeToken>
  balances: ArbTokenBridgeBalances
  cache: ArbTokenBridgeCache
  eth: ArbTokenBridgeEth
  token: ArbTokenBridgeToken
  arbSigner: Signer
  transactions: ArbTokenBridgeTransactions
  pendingWithdrawalsMap: PendingWithdrawalsMap
  setInitialPendingWithdrawals: (gatewayAddresses: string[]) => Promise<void>
}
