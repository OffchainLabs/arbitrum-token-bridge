import { useReducer, useEffect, useCallback } from 'react';
export const txnTypeToLayer = (txnType) => {
    switch (txnType) {
        case 'deposit':
        case 'deposit-l1':
        case 'outbox':
        case 'approve':
        case 'connext-deposit':
            return 1;
        case 'deposit-l2':
        case 'withdraw':
        case 'connext-withdraw':
        case 'deposit-l2-auto-redeem':
            return 2;
    }
};
function updateStatus(state, status, txID) {
    const newState = [...state];
    const index = newState.findIndex(txn => txn.txID === txID);
    if (index === -1) {
        console.warn('transaction not found', txID);
        return state;
    }
    newState[index] = Object.assign(Object.assign({}, newState[index]), { status });
    return newState;
}
function updateBlockNumber(state, txID, blockNumber) {
    const newState = [...state];
    const index = newState.findIndex(txn => txn.txID === txID);
    if (index === -1) {
        console.warn('transaction not found', txID);
        return state;
    }
    newState[index] = Object.assign(Object.assign({}, newState[index]), { blockNumber });
    return newState;
}
function updateResolvedTimestamp(state, txID, timestamp) {
    const newState = [...state];
    const index = newState.findIndex(txn => txn.txID === txID);
    if (index === -1) {
        console.warn('transaction not found', txID);
        return state;
    }
    newState[index] = Object.assign(Object.assign({}, newState[index]), { timestampResolved: timestamp });
    return newState;
}
function reducer(state, action) {
    switch (action.type) {
        case 'SET_INITIAL_TRANSACTIONS': {
            return [...action.transactions];
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
        default:
            return state;
    }
}
const localStorageReducer = (state, action) => {
    const newState = reducer(state, action);
    window.localStorage.setItem('arbTransactions', JSON.stringify(newState));
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
    const updateTransaction = (txReceipt, tx) => {
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
    };
    const checkAndUpdatePendingTransactions = useCallback(() => {
        const pendingTransactions = 1;
    }, [state]);
    return [
        state,
        {
            addTransaction,
            setTransactionSuccess,
            setTransactionFailure,
            clearPendingTransactions,
            setTransactionConfirmed,
            updateTransaction,
            removeTransaction,
            addFailedTransaction
        }
    ];
};
export default useTransactions;
