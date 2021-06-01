import React from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { utils } from 'ethers'
import { useIsDepositMode } from 'components/App/ModeContext'
import WithdrawInfo from './WithdrawInfo'
import WithdrawWithOptions from './WithdrawWithOptions'
import { connextTxn } from 'util/index'
const { formatEther } = utils

type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
  ethAddress: string
  handleConnextTxn: connextTxn
}

const Actions = ({ balances, eth, ethAddress, handleConnextTxn }: ActionsProps) => {
  const arbChainBalance = balances ? +formatEther(balances.arbChainBalance) : 0
  const isDepositMode = useIsDepositMode()

  return (
    <div>
      <label htmlFor="basic-url">ETH on L2: {arbChainBalance}</label>

      <WithdrawWithOptions
        max={arbChainBalance}
        text={'Withdraw Eth'}
        onSubmit={eth.withdraw}
        disabled={arbChainBalance === 0 || isDepositMode}
        buttonText={'withdraw'}
        ethAddress={ethAddress}
        handleConnextTxn={handleConnextTxn}
        id={1}
      />
          <WithdrawInfo/>
    </div>
  )
}

export default Actions
