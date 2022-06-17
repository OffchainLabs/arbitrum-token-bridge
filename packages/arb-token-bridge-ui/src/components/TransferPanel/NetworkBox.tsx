import React, { useMemo } from 'react'
import { useWallet } from '@arbitrum/use-wallet'
import { BigNumber, utils } from 'ethers'
import { BridgeBalance } from 'token-bridge-sdk'
import Loader from 'react-loader-spinner'

import { AmountBox } from './AmountBox'
import { TokenButton } from './TokenButton'
import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { formatBigNumber } from '../../util/NumberUtils'

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
    <span className="font-regular text-lg text-white lg:text-2xl">
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
      setAmount(utils.formatUnits(balance, selectedToken?.decimals || 18))
      return
    }
    const gasPrice: BigNumber | undefined = await provider?.getGasPrice()
    if (!gasPrice) {
      return
    }
    console.log('Gas price', utils.formatUnits(gasPrice.toString(), 18))
    const balanceMinusGas = utils.formatUnits(
      balance.sub(gasPrice).toString(),
      // @ts-ignore
      selectedToken?.decimals || 18
    )
    console.log('Price - gas price', balanceMinusGas)

    setAmount(balanceMinusGas)
  }

  const balanceMemo = useMemo(() => {
    return (
      <div className="flex items-center">
        {balance ? (
          <span className="mr-1 font-light text-white lg:text-xl">
            Balance: {formatBigNumber(balance, selectedToken?.decimals)}
          </span>
        ) : (
          <Loader type="TailSpin" color="white" height={16} width={16} />
        )}
        {balance !== null && balance !== undefined && (
          <span className="mr-1 font-light text-white lg:text-xl">
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
      className={`w-full rounded-xl p-2 ${className} ${networkStyleProps.className}`}
    >
      <div
        className={`p-4 ${networkStyleProps.className}`}
        style={networkStyleProps.style}
      >
        <div className="flex flex-col">
          <div className="flex flex-row items-center justify-between">
            <NetworkInfo isL1={isL1} />
            <div>{balanceMemo}</div>
          </div>
          {canIEnterAmount && (
            <>
              <div className="h-4" />
              <div className="flex h-16 flex-row items-center rounded-lg border border-v3-gray-9 bg-white">
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
