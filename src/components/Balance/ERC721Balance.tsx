import React, { useState, useEffect } from 'react'
import { ERC721Balance } from 'arb-token-bridge'
import AssetDropDown from 'components/AssetDropDown'
import { formatEther } from 'ethers/utils'

type BalanceProps = {
  balances: ERC721Balance | undefined
}

const ERC721BalanceUi = ({ balances }: BalanceProps) => {
  if (!balances) {
    return <div>no token</div>
  }
  const { tokens, arbChainTokens, totalArbTokens, lockBoxTokens } = balances

  return (
    <div>
        erc721
    </div>
  )
}
export default ERC721BalanceUi
