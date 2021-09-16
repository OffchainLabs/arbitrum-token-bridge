import React, { Dispatch, SetStateAction, useMemo } from 'react'

import { useWallet } from '@gimmixorg/use-wallet'
import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import Loader from 'react-loader-spinner'
import { BridgeBalance } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import ExplorerLink from '../common/ExplorerLink'
import { AmountBox } from './AmountBox'

const NetworkBox = ({
  isL1,
  amount,
  className,
  setAmount
}: {
  isL1: boolean
  amount: string
  className?: string
  setAmount: (amount: string) => void
}) => {
  const { provider } = useWallet()
  const {
    app: { isDepositMode, selectedToken, arbTokenBridge, networkID }
  } = useAppState()
  const balance = useMemo(() => {
    let b: BridgeBalance | undefined = arbTokenBridge?.balances?.eth
    if (selectedToken) {
      b = arbTokenBridge?.balances?.erc20[selectedToken.address]
    }
    if (isL1) {
      return b?.balance
    }
    return b?.arbChainBalance
  }, [isL1, selectedToken, arbTokenBridge])

  const canIEnterAmount = useMemo(() => {
    return (isL1 && isDepositMode) || (!isL1 && !isDepositMode)
  }, [isDepositMode, isL1])

  const isMainnet = networkID === '1' || networkID === '42161'

  async function setMaxAmount() {
    if (!balance) {
      return
    }
    if (selectedToken) {
      // @ts-ignore
      return formatUnits(balance, selectedToken?.decimals || 18)
    }
    const gasPrice: BigNumber | undefined = await provider?.getGasPrice()
    if (!gasPrice) {
      return
    }
    console.log('Gas price', formatUnits(gasPrice.toString(), 18))
    const balanceMinusGas = formatUnits(
      balance.sub(gasPrice).toString(),
      // @ts-ignore
      selectedToken?.decimals || 18
    )
    console.log('Price - gas price', balanceMinusGas)

    setAmount(balanceMinusGas)
  }

  return (
    <div
      className={`max-w-networkBox w-full mx-auto shadow-networkBox bg-white p-6 rounded-lg ${
        className || ''
      }`}
    >
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row">
        <div className="flex flex-col">
          <p className="text-sm leading-5 font-medium text-gray-700 mb-1">
            Layer {isL1 ? '1' : '2'} {!isMainnet && <span>(testnet)</span>}
          </p>
          <div className="flex items-center text-lg leading-8 font-semibold text-bright-blue mb-1">
            <span>Balance: </span>
            {balance ? (
              <span className="mx-1">
                {/* @ts-ignore */}
                {formatUnits(balance, selectedToken?.decimals || 18)}
              </span>
            ) : (
              <div className="mx-2">
                <Loader
                  type="Oval"
                  color="rgb(40, 160, 240)"
                  height={14}
                  width={14}
                />
              </div>
            )}
            {balance !== null && balance !== undefined && (
              <span> {selectedToken ? selectedToken.symbol : 'Eth'}</span>
            )}
          </div>
          {selectedToken && (
            <p className="text-sm leading-5 font-medium text-gray-500">
              Token deployed at:
              <ExplorerLink
                hash={isL1 ? selectedToken.address : selectedToken.l2Address}
                type="address"
                layer={isL1 ? 1 : 2}
              />
            </p>
          )}
        </div>
        {canIEnterAmount && (
          <AmountBox
            amount={amount}
            setAmount={setAmount}
            setMaxAmount={setMaxAmount}
          />
        )}
      </div>
    </div>
  )
}

export { NetworkBox }
