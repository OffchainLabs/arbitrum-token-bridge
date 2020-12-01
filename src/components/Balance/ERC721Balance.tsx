import React, { useState, useEffect, useMemo } from 'react'
import { ERC721Balance } from 'token-bridge-sdk'
import AssetDropDown from 'components/AssetDropDown'
import { BigNumber } from 'ethers/utils'
import { Transaction } from 'token-bridge-sdk'

type BalanceProps = {
  balances: ERC721Balance | undefined
  transactions: Transaction[]
  bridgeTokens: any
  currentERC721Address: string
}

const ERC721BalanceUi = ({ balances, transactions, bridgeTokens, currentERC721Address }: BalanceProps) => {

  const currentContract = bridgeTokens[currentERC721Address]
  const pendingTokenBalance = useMemo(()=>{
    if (!currentContract){
      return []
    }
    return transactions.reduce((acc: string[], txn: Transaction)=>{
      const { type, assetName, status, value } = txn
      if (type === 'withdraw' && status === 'success' && assetName === currentContract.symbol && typeof value === "string"){
        return acc.concat([value])
      } else {
        return acc
      }

    }, [])
  }, [transactions, currentContract])
  if (!balances) {
    return <div></div>
  }
  const { tokens, arbChainTokens, totalArbTokens, lockBoxTokens } = balances

  const formatTokenList = (arr: BigNumber[]) => {
    return `[${arr.map((token: BigNumber) => token.toNumber()).join(',')}]`
  }
  return (
    <div>
      <div className="row">
        <h3>ERC721 Info</h3>
      </div>
      <div className="row">Tokens on Ethereum: {formatTokenList(tokens)}</div>
      <div className="row">
        Tokens on Arb: {formatTokenList(arbChainTokens)}
      </div>
      {/* <div className="row">
        All Tokens on Arb: {formatTokenList(totalArbTokens)}
      </div> */}
      <div className="row">
        LockBox Tokens on Arb: {formatTokenList(lockBoxTokens)}
      </div>
      {pendingTokenBalance.length > 0 ? <div className="row">
        <i>pending token withdrawals: {pendingTokenBalance.map((t)=>`'${t}'`).join(',')} </i>
      </div> : null }
    </div>
  )
}
export default ERC721BalanceUi
