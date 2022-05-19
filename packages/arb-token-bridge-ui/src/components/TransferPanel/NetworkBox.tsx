import React, { useMemo } from 'react'

import { useWallet } from '@arbitrum/use-wallet'
import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import Loader from 'react-loader-spinner'
import { BridgeBalance } from 'token-bridge-sdk'

import { useAppState } from '../../state'

import { AmountBox } from './AmountBox'
import { TokenButton } from './TokenButton'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

const NetworkStyleProps: {
  L1: { style: React.CSSProperties; className: string }
  L2: { style: React.CSSProperties; className: string }
} = {
  L1: {
    style: { backgroundImage: `url(/images/NetworkBoxEth.png)` },
    className: 'bg-contain bg-no-repeat bg-v3-ethereum-dark-purple'
  },
  L2: {
    style: { backgroundImage: `url(/images/NetworkBoxArb.png)` },
    className: 'bg-contain bg-no-repeat bg-v3-arbitrum-dark-blue'
  }
}

function NetworkInfo({ isL1 }: { isL1: boolean }): JSX.Element | null {
  const {
    app: { isDepositMode }
  } = useAppState()
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()

  const fromOrTo = useMemo(() => {
    if (isDepositMode) {
      return isL1 ? 'From' : 'To'
    }

    return isL1 ? 'To' : 'From'
  }, [isL1, isDepositMode])

  if (typeof l1Network === 'undefined' || typeof l2Network === 'undefined') {
    return null
  }

  return (
    <span className="text-white text-xl lg:text-2xl font-regular">
      <span className="hidden sm:inline">{fromOrTo}: </span>
      <span>{isL1 ? l1Network.name : l2Network.name}</span>
    </span>
  )
}

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
    function formatBalance(balance: BigNumber, decimals: number | undefined) {
      return parseFloat(formatUnits(balance, decimals || 18)).toFixed(6)
    }

    return (
      <div className="inline-flex items-center">
        {balance ? (
          <span className="mr-1 text-white text-lg lg:text-xl font-light">
            {formatBalance(balance, selectedToken?.decimals)}
          </span>
        ) : (
          <div className="ml-1">
            <Loader type="Oval" color="white" height={12} width={12} />
          </div>
        )}
        {balance !== null && balance !== undefined && (
          <span className="mr-1 text-white text-lg lg:text-xl font-light">
            {selectedToken ? selectedToken.symbol : 'ETH '}
          </span>
        )}
      </div>
    )
  }, [balance, selectedToken])
  const shouldShowMaxButton = !!selectedToken && !!balance && !balance.isZero()

  const networkStyleProps = isL1 ? NetworkStyleProps.L1 : NetworkStyleProps.L2

  return (
    <div
      className={`w-full p-2 rounded-xl ${className} ${networkStyleProps.className}`}
    >
      <div
        className={`p-4 ${networkStyleProps.className}`}
        style={networkStyleProps.style}
      >
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center">
            <NetworkInfo isL1={isL1} />
            <div>
              <span className="text-white text-lg lg:text-xl font-light">
                Balance:{' '}
              </span>
              {balanceMemo}
            </div>
          </div>
          {canIEnterAmount && (
            <>
              <div className="h-4" />
              <div className="flex flex-row items-center rounded-lg h-16 bg-white border border-v3-gray-9">
                <TokenButton />
                <div className="h-full border-r border-v3-gray-4" />
                <AmountBox
                  amount={amount}
                  setAmount={setAmount}
                  setMaxAmount={setMaxAmount}
                  showMaxButton={shouldShowMaxButton}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export { NetworkBox }
