import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { utils } from 'ethers'
import NumberInputForm from './numberInputForm'
import Button from 'react-bootstrap/Button'
import WithdrawWithOptions from './WithdrawWithOptions'

import { useIsDepositMode } from 'components/App/ModeContext'
import WithdrawInfo from './WithdrawInfo'
import { connextTxn } from 'util/index'
const { formatEther, formatUnits } = utils
type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
  bridgeTokens: any
  currentERC20Address: string
  ethAddress: string
  handleConnextTxn: connextTxn
}

const Actions = ({
  balances,
  eth,
  bridgeTokens,
  currentERC20Address,
  ethAddress,
  handleConnextTxn
}: ActionsProps) => {
  const currentContract = bridgeTokens[currentERC20Address]
  const decimals = currentContract && currentContract.decimals || 18
  const arbChainBalance = balances ? +formatUnits(balances.arbChainBalance, decimals) : 0
  const isDepositMode = useIsDepositMode()
  const l2Only = currentContract && !currentContract.eth
  const tokenSymbol = currentContract && currentContract.symbol

  return (
    <div>
      <label htmlFor="basic-url">Token on L2: {arbChainBalance}</label>
      { 
      l2Only ? 
      <div><i>{`${tokenSymbol || "Token"} is an Arbitrum-only token; it can't be withdrawn to L1.` }</i></div>
      :<> <WithdrawWithOptions
        max={arbChainBalance}
        text={'Withdraw Token'}
        onSubmit={value => {
          eth.withdraw(currentERC20Address, value)
        }}
        disabled={arbChainBalance === 0 || isDepositMode || l2Only}
        buttonText={'withdraw'}
        ethAddress={ethAddress}
        assetId={currentERC20Address || undefined}
        handleConnextTxn={handleConnextTxn}
        tokenSymbol={tokenSymbol}
        id={2}
        />
        <WithdrawInfo/>
        </>
      }


    </div>
  )
}

export default Actions
