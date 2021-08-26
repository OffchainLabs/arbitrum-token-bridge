import { AssetType, TransactionActions } from './arbTokenBridge.types';
export declare type TxnStatus = 'pending' | 'success' | 'failure' | 'confirmed';
/** @interface
 * Transaction
 * @alias Transaction
 * @description Bridge transaction data with up to date status.
 */
export declare type TxnType = 'deposit' | 'deposit-l1' | 'deposit-l2' | 'withdraw' | 'outbox' | 'approve' | 'connext-deposit' | 'connext-withdraw' | 'deposit-l2-auto-redeem';
export declare const txnTypeToLayer: (txnType: TxnType) => 1 | 2;
declare type TransactionBase = {
    type: TxnType;
    status: TxnStatus;
    value: string | null;
    txID?: string;
    assetName: string;
    assetType: AssetType;
    sender: string;
    blockNumber?: number;
    l1NetworkID: string;
    timestampResolved?: number;
    timestampCreated?: Date;
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
declare const useTransactions: () => [Transaction[], TransactionActions];
export default useTransactions;
