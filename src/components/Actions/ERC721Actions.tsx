import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { ERC721Balance } from 'arb-token-bridge'
import { formatEther } from 'ethers/utils'
import NumberInputForm from './numberInputForm'
import Button from 'react-bootstrap/Button'
// TODO: refactor with EthActions into one component?
type ActionsProps = {
  balances: ERC721Balance | undefined
  eth: any
  bridgeTokens: any
  currentERC721Address: string
}

const Actions = ({
  balances,
  eth,
  bridgeTokens,
  currentERC721Address
}: ActionsProps) => {
  const currentContract = bridgeTokens[currentERC721Address]

  return (
    <div>
      <Button
        variant="outline-secondary"
        disabled={false}
        onClick={() => eth.approve(currentERC721Address)}
      >
        Approve
      </Button>
    </div>
  )
}

export default Actions
