import React, { useState, useEffect } from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import AssetDropDown from 'components/AssetDropDown'
import { utils } from 'ethers'
const { formatEther } = utils
type BalanceProps = {
  assetName: string
  balances: BridgeBalance | undefined
}

const Balance = ({ balances, assetName }: BalanceProps) => {
  if (!balances) {
    return <div>no token</div>
  }
  const { balance, arbChainBalance } = balances
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
      <div className="row">User Lockbox Balance:</div>
    </div>
  )
}
export default Balance
