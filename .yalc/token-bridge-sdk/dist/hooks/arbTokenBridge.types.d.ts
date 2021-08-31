import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { L2ToL1EventResult, OutgoingMessageState } from 'arb-ts';
import { BigNumber, ContractReceipt, ethers, Signer } from 'ethers';
import { FailedTransaction, NewTransaction, Transaction } from './useTransactions';
export interface L2ToL1EventResultPlus extends L2ToL1EventResult {
    type: AssetType;
    value: BigNumber;
    tokenAddress?: string;
    outgoingMessageState: OutgoingMessageState;
    symbol: string;
}
export interface PendingWithdrawalsMap {
    [id: string]: L2ToL1EventResultPlus;
}
export interface BridgeToken {
    type: TokenType;
    name: string;
    symbol: string;
    allowed: boolean;
    address: string;
    l2Address?: string;
}
export interface ERC20BridgeToken extends BridgeToken {
    type: TokenType.ERC20;
    decimals: number;
}
export declare enum TokenType {
    ERC20 = "ERC20",
    ERC721 = "ERC721"
}
export declare enum AssetType {
    ERC20 = "ERC20",
    ERC721 = "ERC721",
    ETH = "ETH"
}
export interface ContractStorage<T> {
    [contractAddress: string]: T | undefined;
}
export interface BridgeBalance {
    balance: BigNumber;
    arbChainBalance: BigNumber;
}
/**
 * Holds balance values for ERC721 Token.
 * @name ERC721Balance
 * @alias ERC721Balance
 */
export interface ERC721Balance {
    /**
     * User's NFT balance on L1
     */
    ethBalance: BigNumber;
    arbBalance: BigNumber;
    tokens: BigNumber[];
    /**
     *  User's NFTs on Arbitrum
     */
    arbChainTokens: BigNumber[];
    /**
     * All NFTs on Arbitrum
     */
    totalArbTokens: BigNumber[];
    /**
     * All of user's NFTs available in lockbox (ready to transfer out.)
     */
    lockBoxTokens: BigNumber[];
}
export interface AddressToSymbol {
    [tokenAddress: string]: string;
}
export interface ArbTokenBridgeBalances {
    eth: BridgeBalance;
    erc20: ContractStorage<BridgeBalance>;
    erc721: ContractStorage<ERC721Balance>;
    update: () => void;
}
export interface ArbTokenBridgeEth {
    deposit: (etherVal: string) => Promise<void | ContractReceipt>;
    withdraw: (etherVal: string) => Promise<void | ContractReceipt>;
    triggerOutbox: (id: string) => Promise<void | ContractReceipt>;
    updateBalances: () => Promise<void>;
}
export interface ArbTokenBridgeCache {
    erc20: string[];
    erc721: string[];
    expire: () => void;
}
export interface ArbTokenBridgeToken {
    add: (erc20L1orL2Address: string, type: TokenType) => Promise<string>;
    approve: (erc20L1Address: string) => Promise<void>;
    deposit: (erc20Address: string, amount: string) => Promise<void | ContractReceipt>;
    withdraw: (erc20l1Address: string, amount: string) => Promise<void | ContractReceipt>;
    triggerOutbox: (id: string) => Promise<void | ContractReceipt>;
    updateBalances: () => Promise<void>;
}
export interface TransactionActions {
    addFailedTransaction: (transaction: FailedTransaction) => void;
    setTransactionSuccess: (txID: string) => void;
    setTransactionFailure: (txID?: string) => void;
    removeTransaction: (txID: string) => void;
    addTransaction: (transaction: NewTransaction) => void;
    clearPendingTransactions: () => void;
    setTransactionConfirmed: (txID: string) => void;
    updateTransaction: (txReceipt: TransactionReceipt, tx?: ethers.ContractTransaction) => void;
}
export declare type ArbTokenBridgeTransactions = {
    transactions: Transaction[];
} & Pick<TransactionActions, 'addTransaction' | 'clearPendingTransactions' | 'setTransactionConfirmed' | 'updateTransaction'>;
export interface ArbTokenBridge {
    walletAddress: string;
    bridgeTokens: ContractStorage<BridgeToken>;
    balances: ArbTokenBridgeBalances;
    cache: ArbTokenBridgeCache;
    eth: ArbTokenBridgeEth;
    token: ArbTokenBridgeToken;
    arbSigner: Signer;
    transactions: ArbTokenBridgeTransactions;
    pendingWithdrawalsMap: PendingWithdrawalsMap;
    setInitialPendingWithdrawals: (gatewayAddresses: string[], filter?: ethers.providers.Filter) => Promise<void>;
}
