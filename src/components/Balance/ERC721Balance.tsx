import React, { useState, useEffect } from 'react'
import { ERC721Balance } from 'token-bridge-sdk'
import AssetDropDown from 'components/AssetDropDown'
import { BigNumber } from 'ethers/utils'

type BalanceProps = {
  balances: ERC721Balance | undefined
}

const ERC721BalanceUi = ({ balances }: BalanceProps) => {
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
    </div>
  )
}
export default ERC721BalanceUi
