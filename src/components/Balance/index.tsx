import React, { useState, useEffect } from 'react'
import { BridgeBalance } from '../../hooks/useArbTokenBridge'

type BalanceProps = {
  assetName: string
  balances: BridgeBalance
}

const Balance = ({ balances, assetName }: BalanceProps) => {
  if (!balances) {
    return <div></div>
  }
  const { balance, arbChainBalance, totalArbBalance, lockBoxBalance } = balances
  return (
    <div>
      <div className="row">
        <h3>{assetName} Info</h3>
      </div>
      <div className="row">
        User {assetName} Balance on Ethereum: {balance}
      </div>
      <div className="row">
        User {assetName} balance on ArbChain: {arbChainBalance}
      </div>
      <div className="row">
        Total {assetName} held by ArbChain: {totalArbBalance}
      </div>
      <div className="row">User Lockbox Balance: {lockBoxBalance}</div>
    </div>
  )
}
export default Balance
