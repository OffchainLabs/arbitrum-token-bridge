import React, { useReducer } from 'react'

type Action =
 | { type: 'ADD_TRANSACTION', transaction:  Transaction}
 | { type: 'SET_SUCCESS', txID: string}
 | { type: 'SET_FAILURE', txID:  string }
 type TxnStatus = 'pending' | 'success' | 'failure'

type Transaction   = {
    type: 'deposit' | 'withdraw' | 'lockbox' | 'approve';
    status: TxnStatus;
    value: string | null;
    txID: string;
    asset: string;
    sender: string;
}

interface  NewTransaction extends Transaction {
    status: 'pending'
}


function reducer(state: Transaction[], action: Action) {
    switch (action.type) {
      case 'ADD_TRANSACTION':{
        return state.concat(action.transaction)
      }
      case 'SET_SUCCESS': {
        const newState = [...state]
        const index =  newState.findIndex((txn)=> txn.txID === action.txID)
        if (index === -1){
            console.warn('transaction not found', action.txID);
            return state
        }
        newState[index] = {
            ...newState[index],
            status: 'success'
        }
        return newState
    }
    case 'SET_FAILURE': {
        const newState = [...state]
        const index =  newState.findIndex((txn)=> txn.txID === action.txID)
        if (index === -1){
            console.warn('transaction not found', action.txID);
            return state
        }
        newState[index] = {
            ...newState[index],
            status:  'failure'
        }
    return newState

    }
      default:
        throw new Error();
    }
  }
const  useTransactions = (): [ Transaction[], any ] => {
      const [state, dispatch] = useReducer(reducer, [])

      const addTransaction = (transaction: NewTransaction)=>{
          return dispatch({
              type: 'ADD_TRANSACTION',
              transaction
          })
      }
      const setTransactionSuccess = (txID: string)=>{
        return dispatch({
            type: 'SET_SUCCESS',
            txID: txID
        })
      }
        const setTransactionFailure = (txID: string)=>{
            return dispatch({
                type: 'SET_FAILURE',
                txID: txID
            })
          }
        return [ state, {addTransaction, setTransactionSuccess, setTransactionFailure  } ]

  }


export default useTransactions
