var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useReducer, useEffect, useMemo } from 'react';
import { L1ToL2MessageStatus } from '@arbitrum/sdk';
import { EthDepositStatus } from '@arbitrum/sdk/dist/lib/message/L1ToL2Message';
const deprecatedTxTypes = new Set([
    'deposit-l2-auto-redeem',
    'deposit-l2-ticket-created',
    'deposit-l2'
]);
export const txnTypeToLayer = (txnType) => {
    switch (txnType) {
        case 'deposit':
        case 'deposit-l1':
        case 'outbox':
        case 'approve':
            return 1;
        case 'deposit-l2':
        case 'withdraw':
        case 'deposit-l2-auto-redeem':
        case 'deposit-l2-ticket-created':
        case 'approve-l2':
            return 2;
    }
};
function updateStatus(state, status, txID) {
    const newState = [...state];
    const index = newState.findIndex(txn => txn.txID === txID);
    const transaction = newState[index];
    if (!transaction) {
        console.warn('transaction not found', txID);
        return state;
    }
    newState[index] = Object.assign(Object.assign({}, transaction), { status });
    return newState;
}
function updateBlockNumber(state, txID, blockNumber) {
    const newState = [...state];
    const index = newState.findIndex(txn => txn.txID === txID);
    const transaction = newState[index];
    if (!transaction) {
        console.warn('transaction not found', txID);
        return state;
    }
    newState[index] = Object.assign(Object.assign({}, transaction), { blockNumber });
    return newState;
}
function updateTxnL1ToL2Msg(state, txID, l1ToL2MsgData) {
    const newState = [...state];
    const index = newState.findIndex(txn => txn.txID === txID);
    const transaction = newState[index];
    if (!transaction) {
        console.warn('transaction not found', txID);
        return state;
    }
    if (!(transaction.type === 'deposit' || transaction.type === 'deposit-l1')) {
        throw new Error("Attempting to add a l1tol2msg to a tx that isn't a deposit:" + txID);
    }
    const previousL1ToL2MsgData = transaction.l1ToL2MsgData;
    if (!previousL1ToL2MsgData) {
        newState[index] = Object.assign(Object.assign({}, transaction), { l1ToL2MsgData: {
                status: l1ToL2MsgData.status,
                retryableCreationTxID: l1ToL2MsgData.retryableCreationTxID,
                fetchingUpdate: false
            } });
        return newState;
    }
    newState[index] = Object.assign(Object.assign({}, transaction), { l1ToL2MsgData: Object.assign(Object.assign({}, previousL1ToL2MsgData), l1ToL2MsgData) });
    return newState;
}
function updateResolvedTimestamp(state, txID, timestamp) {
    const newState = [...state];
    const index = newState.findIndex(txn => txn.txID === txID);
    const transaction = newState[index];
    if (!transaction) {
        console.warn('transaction not found', txID);
        return state;
    }
    newState[index] = Object.assign(Object.assign({}, transaction), { timestampResolved: timestamp });
    return newState;
}
function reducer(state, action) {
    switch (action.type) {
        case 'SET_INITIAL_TRANSACTIONS': {
            // Add l1 to L2 stuff with pending status
            return [...action.transactions];
        }
        case 'ADD_TRANSACTIONS': {
            // sanity / safety check: ensure no duplicates:
            const currentTxIds = new Set(state.map(tx => tx.txID));
            const txsToAdd = action.transactions.filter(tx => {
                if (!currentTxIds.has(tx.txID)) {
                    return true;
                }
                else {
                    console.warn(`Warning: trying to add ${tx.txID} which is already included`);
                    return false;
                }
            });
            return state.concat(txsToAdd);
        }
        case 'ADD_TRANSACTION': {
            return state.concat(action.transaction);
        }
        case 'REMOVE_TRANSACTION': {
            return state.filter(txn => txn.txID !== action.txID);
        }
        case 'SET_SUCCESS': {
            return updateStatus(state, 'success', action.txID);
        }
        case 'SET_FAILURE': {
            return updateStatus(state, 'failure', action.txID);
        }
        case 'CLEAR_PENDING': {
            return state.filter(txn => txn.status !== 'pending');
        }
        case 'CONFIRM_TRANSACTION': {
            return updateStatus(state, 'confirmed', action.txID);
        }
        case 'SET_BLOCK_NUMBER': {
            return updateBlockNumber(state, action.txID, action.blockNumber);
        }
        case 'SET_RESOLVED_TIMESTAMP': {
            return updateResolvedTimestamp(state, action.txID, action.timestamp);
        }
        case 'UPDATE_L1TOL2MSG_DATA': {
            return updateTxnL1ToL2Msg(state, action.txID, action.l1ToL2MsgData);
        }
        case 'SET_TRANSACTIONS': {
            return action.transactions;
        }
        default:
            return state;
    }
}
const localStorageReducer = (state, action) => {
    const newState = reducer(state, action);
    // don't cache fetchingUpdate state
    const stateForCache = newState.map(tx => {
        if (tx.l1ToL2MsgData && tx.l1ToL2MsgData.fetchingUpdate) {
            return Object.assign(Object.assign({}, tx), { l1ToL2MsgData: Object.assign(Object.assign({}, tx.l1ToL2MsgData), { fetchingUpdate: false }) });
        }
        return tx;
    });
    window.localStorage.setItem('arbTransactions', JSON.stringify(stateForCache));
    return newState;
};
const useTransactions = () => {
    const [state, dispatch] = useReducer(localStorageReducer, []);
    useEffect(() => {
        const cachedTransactions = window.localStorage.getItem('arbTransactions');
        dispatch({
            type: 'SET_INITIAL_TRANSACTIONS',
            transactions: cachedTransactions ? JSON.parse(cachedTransactions) : []
        });
    }, []);
    const addTransaction = (transaction) => {
        if (!transaction.txID) {
            console.warn(' Cannot add transaction: TxID not included (???)');
            return;
        }
        const tx = Object.assign(Object.assign({}, transaction), { timestampCreated: new Date().toISOString() });
        return dispatch({
            type: 'ADD_TRANSACTION',
            transaction: tx
        });
    };
    const addTransactions = (transactions) => {
        const timestampedTransactions = transactions.map(txn => {
            return Object.assign(Object.assign({}, txn), { timestampCreated: new Date().toISOString() });
        });
        return dispatch({
            type: 'ADD_TRANSACTIONS',
            transactions: timestampedTransactions
        });
    };
    const addFailedTransaction = (transaction) => {
        if (!transaction.txID) {
            console.warn(' Cannot add transaction: TxID not included (???)');
            return;
        }
        const tx = transaction;
        return dispatch({
            type: 'ADD_TRANSACTION',
            transaction: tx
        });
    };
    const updateTxnL1ToL2MsgData = (txID, l1ToL2MsgData) => __awaiter(void 0, void 0, void 0, function* () {
        dispatch({
            type: 'UPDATE_L1TOL2MSG_DATA',
            txID: txID,
            l1ToL2MsgData
        });
    });
    const fetchAndUpdateEthDepositMessageStatus = (txID, ethDepositMessage) => __awaiter(void 0, void 0, void 0, function* () {
        updateTxnL1ToL2MsgData(txID, {
            fetchingUpdate: true,
            status: L1ToL2MessageStatus.NOT_YET_CREATED,
            retryableCreationTxID: ethDepositMessage.l2DepositTxHash
        });
        const status = yield ethDepositMessage.status();
        const isDeposited = status === EthDepositStatus.DEPOSITED;
        updateTxnL1ToL2MsgData(txID, {
            fetchingUpdate: false,
            status: isDeposited
                ? L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
                : L1ToL2MessageStatus.NOT_YET_CREATED,
            retryableCreationTxID: ethDepositMessage.l2DepositTxHash,
            // Only show `l2TxID` after the deposit is confirmed
            l2TxID: isDeposited ? ethDepositMessage.l2DepositTxHash : undefined
        });
    });
    const fetchAndUpdateL1ToL2MsgStatus = (txID, l1ToL2Msg, isEthDeposit, currentStatus) => __awaiter(void 0, void 0, void 0, function* () {
        // set fetching:
        updateTxnL1ToL2MsgData(txID, {
            fetchingUpdate: true,
            status: currentStatus,
            retryableCreationTxID: l1ToL2Msg.retryableCreationId
        });
        const res = yield l1ToL2Msg.getSuccessfulRedeem();
        const l2TxID = (() => {
            if (res.status === L1ToL2MessageStatus.REDEEMED) {
                return res.l2TxReceipt.transactionHash;
            }
            else if (res.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2 &&
                isEthDeposit) {
                return l1ToL2Msg.retryableCreationId; /** for completed eth deposits, retryableCreationId is the l2txid */
            }
            else {
                return undefined;
            }
        })();
        updateTxnL1ToL2MsgData(txID, {
            status: res.status,
            l2TxID,
            fetchingUpdate: false,
            retryableCreationTxID: l1ToL2Msg.retryableCreationId
        });
    });
    const fetchAndUpdateL1ToL2MsgClassicStatus = (txID, l1ToL2Msg, isEthDeposit, status) => __awaiter(void 0, void 0, void 0, function* () {
        const isCompletedEthDeposit = isEthDeposit && status >= L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2;
        const l2TxID = (() => {
            if (isCompletedEthDeposit) {
                return l1ToL2Msg.retryableCreationId;
            }
            if (status === L1ToL2MessageStatus.REDEEMED) {
                return l1ToL2Msg.l2TxHash;
            }
            return undefined;
        })();
        updateTxnL1ToL2MsgData(txID, {
            status: isCompletedEthDeposit
                ? L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
                : status,
            l2TxID,
            fetchingUpdate: false,
            retryableCreationTxID: l1ToL2Msg.retryableCreationId
        });
    });
    const removeTransaction = (txID) => {
        return dispatch({
            type: 'REMOVE_TRANSACTION',
            txID: txID
        });
    };
    const setTransactionSuccess = (txID) => {
        return dispatch({
            type: 'SET_SUCCESS',
            txID: txID
        });
    };
    const setTransactionBlock = (txID, blockNumber) => {
        return dispatch({
            type: 'SET_BLOCK_NUMBER',
            txID,
            blockNumber
        });
    };
    const setResolvedTimestamp = (txID, timestamp) => {
        return dispatch({
            type: 'SET_RESOLVED_TIMESTAMP',
            txID,
            timestamp
        });
    };
    const setTransactionFailure = (txID) => {
        if (!txID) {
            console.warn(' Cannot set transaction failure: TxID not included (???)');
            return;
        }
        return dispatch({
            type: 'SET_FAILURE',
            txID: txID
        });
    };
    const clearPendingTransactions = () => {
        return dispatch({
            type: 'CLEAR_PENDING'
        });
    };
    const setTransactionConfirmed = (txID) => {
        return dispatch({
            type: 'CONFIRM_TRANSACTION',
            txID: txID
        });
    };
    const updateTransaction = (txReceipt, tx, l1ToL2MsgData) => {
        if (!txReceipt.transactionHash) {
            return console.warn('*** TransactionHash not included in transaction receipt (???) *** ');
        }
        switch (txReceipt.status) {
            case 0: {
                setTransactionFailure(txReceipt.transactionHash);
                break;
            }
            case 1: {
                setTransactionSuccess(txReceipt.transactionHash);
                break;
            }
            default:
                console.warn('*** Status not included in transaction receipt *** ');
                break;
        }
        console.log('TX for update', tx);
        if (tx === null || tx === void 0 ? void 0 : tx.blockNumber) {
            setTransactionBlock(txReceipt.transactionHash, tx.blockNumber);
        }
        if (tx) {
            setResolvedTimestamp(txReceipt.transactionHash, new Date().toISOString());
        }
        if (l1ToL2MsgData) {
            updateTxnL1ToL2MsgData(txReceipt.transactionHash, l1ToL2MsgData);
        }
    };
    const setDepositsInStore = (newTransactions) => {
        // appends the state with a new set of transactions
        // useful when you want to display some transactions fetched from subgraph without worrying about existing state
        const transactionsMap = {};
        [...transactions, ...newTransactions].forEach(tx => {
            transactionsMap[tx.txID] = tx;
        });
        return dispatch({
            type: 'SET_TRANSACTIONS',
            transactions: Object.values(transactionsMap)
        });
    };
    const transactions = useMemo(() => {
        return state.filter(tx => !deprecatedTxTypes.has(tx.type));
    }, [state]);
    return [
        transactions,
        {
            addTransaction,
            addTransactions,
            setDepositsInStore,
            setTransactionSuccess,
            setTransactionFailure,
            clearPendingTransactions,
            setTransactionConfirmed,
            updateTransaction,
            removeTransaction,
            addFailedTransaction,
            fetchAndUpdateL1ToL2MsgStatus,
            fetchAndUpdateL1ToL2MsgClassicStatus,
            fetchAndUpdateEthDepositMessageStatus
        }
    ];
};
export default useTransactions;
