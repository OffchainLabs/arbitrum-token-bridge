import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { ERC721Balance } from 'arb-token-bridge'
import { formatEther } from 'ethers/utils'
import DropdownInput from './DropdownInput'
import Button from 'react-bootstrap/Button'
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
  if (!balances) {
    return <div>asdf</div>
  }
  const { tokens, arbChainTokens, totalArbTokens, lockBoxTokens } = balances

  return (
    <div>
      {currentContract && !currentContract.allowed && <Button
        variant="outline-secondary"
        disabled={!currentContract.allowed}
        onClick={() => eth.approve(currentERC721Address)}
      >
        Approve
      </Button>
      }
      <DropdownInput
        items={tokens}
        text={'Deposit NFT'}
        action={'deposit'}
        onSubmit={value => {
          eth.deposit(currentERC721Address, value)
        }}
      />
      <DropdownInput
        items={arbChainTokens}
        text={'Withdraw NFT'}
        action={'Withdraw'}
        onSubmit={value => {
          eth.withdraw(currentERC721Address, value)
        }}
      />
      <DropdownInput
        items={lockBoxTokens}
        text={'Withdraw LockBox'}
        action={'Withdraw'}
        onSubmit={value => {
          eth.withdrawLockBox(currentERC721Address, value)
        }}
      />
    </div>
  )
}

export default Actions
