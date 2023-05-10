import { AssetType, TransactionActions } from './arbTokenBridge.types';
import { BigNumber } from 'ethers';
import { L1ToL2MessageStatus } from '@arbitrum/sdk';
export type TxnStatus = 'pending' | 'success' | 'failure' | 'confirmed';
/** @interface
 * Transaction
 * @alias Transaction
 * @description Bridge transaction data with up to date status.
 */
export type TxnType = 'deposit' | 'deposit-l1' | 'deposit-l2' | 'withdraw' | 'outbox' | 'approve' | 'deposit-l2-auto-redeem' | 'deposit-l2-ticket-created' | 'approve-l2';
export declare const txnTypeToLayer: (txnType: TxnType) => 1 | 2;
export interface L1ToL2MessageData {
    status: L1ToL2MessageStatus;
    retryableCreationTxID: string;
    l2TxID?: string;
    fetchingUpdate: boolean;
}
export type L2ToL1MessageData = {
    uniqueId: BigNumber;
};
type TransactionBase = {
    type: TxnType;
    status: TxnStatus;
    value: string | null;
    txID?: string;
    assetName: string;
    assetType: AssetType;
    tokenAddress?: string;
    sender: string;
    blockNumber?: number;
    l1NetworkID: string;
    l2NetworkID?: string;
    timestampResolved?: string;
    timestampCreated?: string;
    l1ToL2MsgData?: L1ToL2MessageData;
    l2ToL1MsgData?: L2ToL1MessageData;
    isClassic?: boolean;
};
export interface Transaction extends TransactionBase {
    txID: string;
}
export interface NewTransaction extends TransactionBase {
    status: 'pending';
}
export interface FailedTransaction extends TransactionBase {
    status: 'failure';
}
export interface DepositTransaction extends Transaction {
    l1ToL2MsgData: L1ToL2MessageData;
    type: 'deposit' | 'deposit-l1';
}
declare const useTransactions: () => [Transaction[], TransactionActions];
export default useTransactions;
