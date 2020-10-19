import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Transaction, TxnStatus, AssetType } from 'token-bridge-sdk'
import Table from 'react-bootstrap/Table'
import Spinner from 'react-bootstrap/Spinner'
import Button from 'react-bootstrap/Button'
import ExplorerLink from 'components/App/ExplorerLink'
import { JsonRpcProvider, TransactionReceipt } from 'ethers/providers'

interface props {
  transactions: Transaction[]
  walletAddress: string
  clearPendingTransactions: () => any,
  arbProvider: JsonRpcProvider,
  ethProvider: JsonRpcProvider,
  setTransactionConfirmed: (txID: string) => void,
  updateTransactionStatus: (txReceipts: TransactionReceipt)=> void

}

const initialCachedTxns = JSON.parse(window.localStorage.getItem('arbTransactions') || '""') ?.length > 0


const TransactionHistory = ({
  transactions,
  walletAddress,
  clearPendingTransactions,
  arbProvider,
  ethProvider,
  setTransactionConfirmed,
  updateTransactionStatus
}: props) => {

  // TODO: maybe move this to the sdk?
  const getTransactionReceipt = useCallback( (tx: Transaction)=>{
    const provider = tx.type === 'withdraw' ? arbProvider : ethProvider;
    return provider.getTransactionReceipt(tx.txID)

  }, [arbProvider, ethProvider])

  const usersTransactions = useMemo(
    () => transactions.filter(txn => txn.sender === walletAddress).reverse(),
    [transactions, walletAddress]
  )

  const unconfirmedWithdrawals = useMemo(
    () => usersTransactions.filter(txn => txn.status === 'success' && txn.type === 'withdraw'),
    [usersTransactions]
  )

  useEffect(()=>{
    const intervalId = window.setInterval(async function(){
      if (!unconfirmedWithdrawals) return
      const currentBlockHeight = await arbProvider.getBlockNumber()
      unconfirmedWithdrawals.forEach((txn:Transaction)=>{
        if( !txn.blockNumber ||  (txn.blockNumber + 720 < currentBlockHeight) ) {
          setTransactionConfirmed(txn.txID)
        }
      })

    }, 10000)
    return function() {
      clearInterval(intervalId);
    }

  }, [unconfirmedWithdrawals])



  const pendingTransactions = useMemo(
    () => usersTransactions.filter(txn => txn.status === 'pending'),
    [usersTransactions]
  )

  const [checkedForInitialPendingTxns, setCheckedForInitialPendingTxns] = useState(false)
  useEffect(()=>{
    if (checkedForInitialPendingTxns){
      return
    }
    if( !initialCachedTxns ) {
      return setCheckedForInitialPendingTxns(true)
    }
    // transactions have loaded from cache and none of them are pending
    if (usersTransactions.length && !pendingTransactions.length){
      return setCheckedForInitialPendingTxns(true)
    }

    checkAndUpdatePendingTransactions()?.finally(()=>{
      setCheckedForInitialPendingTxns(true)
    })

  }, [checkedForInitialPendingTxns, pendingTransactions, usersTransactions])

  const checkAndUpdatePendingTransactions = useCallback(function(){
    if (pendingTransactions.length){
      console.info("Checking and updating cached pending transactions' statuses")

     return Promise.all(
      pendingTransactions.map((tx:Transaction)=> getTransactionReceipt(tx))
    ).then((txReceipts: TransactionReceipt[])=>{
      txReceipts.forEach((txReceipt:TransactionReceipt, i)=> {
        if (!txReceipt){
          console.warn('Transaction receipt not found:',pendingTransactions[i].txID );
        } else {
          updateTransactionStatus(txReceipt)
        }
      })
    })
  }
  }, [pendingTransactions, getTransactionReceipt])

  useEffect(()=>{
    window.setInterval(checkAndUpdatePendingTransactions, 7500)
  }, [checkAndUpdatePendingTransactions])

  const getRowStyle = (status: TxnStatus) => {
    switch (status) {
      case 'failure':
        return { backgroundColor: 'pink' }
      case 'success':
      case 'confirmed':

        return { backgroundColor: 'lightgreen' }
      default:
        return { opacity: 0.5 }
    }
  }

  const valueDisplay = (txn: Transaction) => {
    const { value, assetType } = txn
    if (typeof txn.value !== 'string') {
      return 'n/a'
    } else if (assetType === AssetType.ERC721) {
      return `'${value}'`
    } else {
      return value
    }
  }
  return (
    <Table id="txn-table" striped bordered hover>
      <thead>
        <tr>
          <th>TxID</th>
          <th>Type</th>
          <th>status</th>
          <th>asset</th>
          <th>value</th>
        </tr>
      </thead>
      <tbody>
        {usersTransactions.length > 0 ? (
          usersTransactions.map(txn => (
            <tr style={getRowStyle(txn.status)} key={txn.txID}>
              <td><ExplorerLink hash={txn.txID} type={txn.type !== 'withdraw' ? "l1-tx" : "tx"}/></td>
              <td>{txn.type}</td>
              <td>
                {' '}
                {txn.status === 'pending' ? (
                  <Spinner animation="border" role="status">
                    <span className="sr-only">Loading...</span>
                  </Spinner>
                ) : (
                  txn.status
                )}{' '}
              </td>
              <td>{txn.assetName}</td>
              <td>{valueDisplay(txn)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td>
              <i>no transactions to display</i>
            </td>
          </tr>
        )}
        {pendingTransactions.length ?  (
          <tr>
            <td>
              <Button onClick={clearPendingTransactions}>
                clear pending txns
              </Button>
            </td>
          </tr>
        ): null}
      </tbody>
    </Table>
  )
}

export default TransactionHistory
