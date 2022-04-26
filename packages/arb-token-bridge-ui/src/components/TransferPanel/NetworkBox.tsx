import React, { useMemo } from 'react'

import { useWallet } from '@arbitrum/use-wallet'
import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import Loader from 'react-loader-spinner'
import { BridgeBalance } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import ExplorerLink from '../common/ExplorerLink'
import { AmountBox } from './AmountBox'
import { TokenButton } from './TokenButton'

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
    app: { isDepositMode, selectedToken, arbTokenBridge }
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

  async function setMaxAmount() {
    if (!balance) {
      return
    }
    if (selectedToken) {
      // @ts-ignore
      setAmount(formatUnits(balance, selectedToken?.decimals || 18))
      return
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

  const balanceMemo = useMemo(() => {
    return (
      <div className="inline-flex items-center">
        {balance ? (
          <span className="mr-1 font-semibold">
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
          <span className="mr-1 font-semibold">
            {selectedToken ? selectedToken.symbol : 'Eth '}
          </span>
        )}
      </div>
    )
  }, [balance, selectedToken])
  const shouldShowMaxButton = !!selectedToken && !!balance && !balance.isZero()

  return (
    <div
      className={`max-w-networkBox w-full mx-auto shadow-networkBox bg-white p-6 rounded-lg ${
        className || ''
      }`}
    >
      <div className="flex flex-col">
        <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row">
          <div className="flex flex-col">
            <p className="text-sm leading-5 font-medium text-gray-700 mb-1">
              Layer {isL1 ? '1' : '2'}
              {' Balance: '}
              <span>{canIEnterAmount && balanceMemo}</span>
            </p>
            {!canIEnterAmount && (
              <div className="flex items-center text-lg leading-8 font-semibold text-gray-700 mb-1">
                {balanceMemo}
              </div>
            )}
            {selectedToken && (
              <p className="text-sm leading-5 font-medium text-gray-500">
                Token address:
                <ExplorerLink
                  hash={isL1 ? selectedToken.address : selectedToken.l2Address}
                  type="address"
                  layer={isL1 ? 1 : 2}
                />
              </p>
            )}
          </div>
          {canIEnterAmount && (
            <div className="self-center sm:self-end mt-4 sm:mt-0">
              <TokenButton />
            </div>
          )}
        </div>
        {canIEnterAmount && (
          <div className="flex self-center mt-5">
            <AmountBox
              amount={amount}
              setAmount={setAmount}
              setMaxAmount={setMaxAmount}
              showMaxButton={shouldShowMaxButton}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export { NetworkBox }
