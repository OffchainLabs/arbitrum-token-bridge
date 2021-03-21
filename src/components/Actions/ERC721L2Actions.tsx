import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { ERC721Balance } from 'token-bridge-sdk'
import { utils } from 'ethers'
import DropdownInput from './DropdownInput'
import Button from 'react-bootstrap/Button'
import { useIsDepositMode } from 'components/App/ModeContext'
import WithdrawInfo from './WithdrawInfo'
const { formatEther } = utils

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
  const isDepositMode = useIsDepositMode()
  const arbChainTokens = balances ? balances.arbChainTokens : []

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
      <WithdrawInfo />
    </div>
  )
}

export default Actions
