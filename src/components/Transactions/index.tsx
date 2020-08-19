import React, { useEffect, useState, useMemo } from 'react'
import { Transaction, TxnStatus, AssetType } from 'arb-token-bridge'
import Table from 'react-bootstrap/Table'
import Spinner from 'react-bootstrap/Spinner'
import Button from 'react-bootstrap/Button'


interface props {
    transactions: Transaction[];
    walletAddress: string;
    clearPendingTransactions: ()=>any

}
const TransactionHistory = ({transactions, walletAddress, clearPendingTransactions}: props)=>{
    const usersTransactions = useMemo(()=>(
        transactions.filter((txn)=> txn.sender === walletAddress).reverse()
    ), [transactions, walletAddress])
    const somePending = useMemo(()=>(
        usersTransactions.some((txn)=> txn.status === 'pending')
    ), [usersTransactions])

    const getRowStyle = (status: TxnStatus )=>{
        switch (status) {
            case 'failure':
                return {backgroundColor: 'pink'}
            case 'success':
                return {backgroundColor: 'lightgreen'}
            default:
                return {opacity: 0.5};
        }
    }

    const valueDisplay = (txn: Transaction)=>{
        const { value, assetType } = txn
        if (typeof txn.value !== 'string'){
            return 'n/a'
        } else if (assetType === AssetType.ERC721){
            return `'${value}'`
        } else {
            return value
        }

    }
    return <Table id='txn-table' striped bordered hover>
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
        { usersTransactions.length > 0 ?
            usersTransactions.map((txn)=>(
                <tr  style={getRowStyle(txn.status)} key={txn.txID}>
                <td>{txn.txID}</td>
                <td>{txn.type}</td>
                <td> {txn.status === 'pending' ? <Spinner animation="border" role="status">
<span className="sr-only">Loading...</span>
</Spinner> : txn.status} </td>
                <td>{txn.assetName}</td>
                <td>{ valueDisplay(txn)}</td>


              </tr>
            )) : <i>no transactions to display</i>
        }
    {somePending && <tr><Button onClick={clearPendingTransactions}>clear pending txns</Button></tr>}
    </tbody>
  </Table>
}

export default TransactionHistory
