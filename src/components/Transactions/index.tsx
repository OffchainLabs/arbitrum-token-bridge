import React, { useEffect, useState, useMemo } from 'react'
import { Transaction, TxnStatus, AssetType } from 'token-bridge-sdk'
import Table from 'react-bootstrap/Table'
import Spinner from 'react-bootstrap/Spinner'
import Button from 'react-bootstrap/Button'
import ExplorerLink from 'components/App/ExplorerLink'
import ethers from 'ethers'

interface props {
  transactions: Transaction[]
  walletAddress: string
  clearPendingTransactions: () => any,
  ethProvider: ethers.ethers.providers.JsonRpcProvider,
  setTransactionConfirmed: (txID: string) => void

}
const TransactionHistory = ({
  transactions,
  walletAddress,
  clearPendingTransactions,
  ethProvider,
  setTransactionConfirmed
}: props) => {
  const usersTransactions = useMemo(
    () => transactions.filter(txn => txn.sender === walletAddress).reverse(),
    [transactions, walletAddress]
  )
  const somePending = useMemo(
    () => usersTransactions.some(txn => txn.status === 'pending'),
    [usersTransactions]
  )

  const someUnconfirmedWithdrawals = useMemo(
    () => usersTransactions.some(txn => txn.status === 'success' && txn.type === 'withdraw'),
    [usersTransactions]
  )

  useEffect(()=>{
    const intervalId = window.setInterval(async function(){
      if (!someUnconfirmedWithdrawals) return
      const currentBlockHeight = await ethProvider.getBlockNumber()
      usersTransactions.filter((txn:Transaction)=>(txn.type === 'withdraw' && txn.status === 'success')).forEach((txn:Transaction)=>{
        if( !txn.blockNumber ||  (txn.blockNumber + 720 < currentBlockHeight) ) {
          setTransactionConfirmed(txn.txID)
        }
      })

    }, 10000)
    return function() {
      clearInterval(intervalId);
    }

  }, [someUnconfirmedWithdrawals, usersTransactions])

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
              <td><ExplorerLink hash={txn.txID} type="tx"/></td>
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
        {somePending && (
          <tr>
            <td>
              <Button onClick={clearPendingTransactions}>
                clear pending txns
              </Button>
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  )
}

export default TransactionHistory
