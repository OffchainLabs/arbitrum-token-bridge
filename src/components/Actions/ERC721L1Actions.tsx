import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { ERC721Balance } from 'token-bridge-sdk'
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
  const isDepositeMode = useIsDepositMode()
  const currentContract = bridgeTokens[currentERC721Address]
  const tokens = balances ? balances.tokens : []
  const lockBoxTokens = balances ? balances.lockBoxTokens : []

  return (
    <div>
      {currentContract && !currentContract.allowed && (
        <Button
          variant="outline-secondary"
          disabled={currentContract.allowed}
          onClick={() => eth.approve(currentERC721Address)}
        >
          Approve
        </Button>
      )}
      <DropdownInput
        items={tokens}
        text={'Deposit NFT'}
        action={'deposit'}
        onSubmit={value => {
          eth.deposit(currentERC721Address, value)
        }}
        disabled={!isDepositeMode}
      />
      <DropdownInput
        items={lockBoxTokens}
        text={'LockBox'}
        action={'transfer lockbox'}
        disabled={!isDepositeMode}
        onSubmit={value => {
          eth.withdrawLockBox(currentERC721Address, value)
        }}
      />
    </div>
  )
}

export default Actions
