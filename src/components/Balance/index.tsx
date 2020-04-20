import React, { useState, useEffect } from 'react'
import { BridgeBalance } from 'arb-token-bridge'
import AssetDropDown from 'components/AssetDropDown'
import { formatEther } from 'ethers/utils'

type BalanceProps = {
  assetName: string
  balances: BridgeBalance | undefined
}

const Balance = ({ balances, assetName }: BalanceProps) => {
  if (!balances) {
    return <div>no token</div>
  }
  const { balance, arbChainBalance, totalArbBalance, lockBoxBalance } = balances
  return (
    <div>
      <div className="row">
        <h3>{assetName} Info</h3>
      </div>
      <div className="row">
        User {assetName} Balance on Ethereum: {formatEther(balance)}
      </div>
      <div className="row">
        User {assetName} balance on ArbChain: {formatEther(arbChainBalance)}
      </div>
      <div className="row">
        Total {assetName} held by ArbChain: {formatEther(totalArbBalance)}
      </div>
      <div className="row">
        User Lockbox Balance: {formatEther(lockBoxBalance)}
      </div>
    </div>
  )
}
export default Balance
