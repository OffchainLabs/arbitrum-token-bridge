import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { ERC721Balance } from 'arb-token-bridge'
import { formatEther } from 'ethers/utils'
import DropdownInput from './DropdownInput'
import Button from 'react-bootstrap/Button'
import { useIsDepositMode } from 'components/App/ModeContext'

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
  // TODO: pass in from TabsContainer
  const currentContract = bridgeTokens[currentERC721Address]
  const isDepositMode = useIsDepositMode()
  if (!balances) {
    return <div></div>
  }
  const { tokens, arbChainTokens, totalArbTokens, lockBoxTokens } = balances

  return (
    <div>
      <DropdownInput
        items={arbChainTokens}
        text={'Withdraw NFT'}
        action={'Withdraw'}
        disabled={isDepositMode}
        onSubmit={value => {
          eth.withdraw(currentERC721Address, value)
        }}
      />
    </div>
  )
}

export default Actions
