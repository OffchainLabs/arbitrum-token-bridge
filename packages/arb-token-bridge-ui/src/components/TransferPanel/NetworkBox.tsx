import React, { useMemo, useState } from 'react'
import { utils, BigNumber } from 'ethers'
import { BridgeBalance } from 'token-bridge-sdk'
import Loader from 'react-loader-spinner'

import { TokenButton } from './TokenButton'
import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { formatBigNumber } from '../../util/NumberUtils'
import { ExternalLink } from '../common/ExternalLink'
import { useGasPrice } from '../../hooks/useGasPrice'

const NetworkStyleProps: {
  L1: { style: React.CSSProperties; className: string }
  L2: { style: React.CSSProperties; className: string }
} = {
  L1: {
    style: { backgroundImage: `url(/images/NetworkBoxEth.png)` },
    className: 'bg-contain bg-no-repeat bg-purple-ethereum'
  },
  L2: {
    style: { backgroundImage: `url(/images/NetworkBoxArb.png)` },
    className: 'bg-contain bg-no-repeat bg-blue-arbitrum'
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

function calculateEstimatedL1GasFees(
  estimatedL1Gas: BigNumber,
  l1GasPrice: BigNumber
) {
  return parseFloat(utils.formatEther(estimatedL1Gas.mul(l1GasPrice)))
}

function calculateEstimatedL2GasFees(
  estimatedL2Gas: BigNumber,
  l2GasPrice: BigNumber,
  estimatedL2SubmissionCost: BigNumber
) {
  return parseFloat(
    utils.formatEther(
      estimatedL2Gas.mul(l2GasPrice).add(estimatedL2SubmissionCost)
    )
  )
}

function MaxButton({
  loading,
  onClick
}: {
  loading: boolean
  onClick: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
}) {
  if (loading) {
    return (
      <div className="px-3">
        <Loader type="TailSpin" color="#999999" height={16} width={16} />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="p-2 text-sm font-light text-gray-9"
    >
      MAX
    </button>
  )
}

export enum NetworkBoxErrorMessage {
  INSUFFICIENT_FUNDS,
  AMOUNT_TOO_LOW
}

export type NetworkBoxProps = {
  isL1: boolean
  amount: string
  className?: string
  setAmount: (amount: string) => void
  errorMessage?: NetworkBoxErrorMessage
}

const NetworkBox = ({
  isL1,
  amount,
  className,
  setAmount,
  errorMessage
}: NetworkBoxProps) => {
  const {
    app: { isDepositMode, selectedToken, arbTokenBridge }
  } = useAppState()
  const { l1GasPrice, l2GasPrice } = useGasPrice()

  const [calculatingMaxAmount, setCalculatingMaxAmount] = useState(false)

  const ethBalance = useMemo(() => {
    let b: BridgeBalance | undefined = arbTokenBridge?.balances?.eth
    return isL1 ? b?.balance : b?.arbChainBalance
  }, [isL1, arbTokenBridge])

  const tokenBalance = useMemo(() => {
    if (!selectedToken) {
      return null
    }

    let b: BridgeBalance | undefined =
      arbTokenBridge?.balances?.erc20[selectedToken.address]

    return isL1 ? b?.balance : b?.arbChainBalance
  }, [isL1, selectedToken, arbTokenBridge])

  const canIEnterAmount = useMemo(() => {
    return (isL1 && isDepositMode) || (!isL1 && !isDepositMode)
  }, [isDepositMode, isL1])

  const errorMessageText = useMemo(() => {
    if (typeof errorMessage === 'undefined') {
      return null
    }

    if (errorMessage === NetworkBoxErrorMessage.AMOUNT_TOO_LOW) {
      return 'Sending ~$0 just to pay gas fees seems like a questionable life choice'
    }

    return `Insufficient balance, please add more to ${isL1 ? 'L1' : 'L2'}.`
  }, [errorMessage, isL1])

  async function estimateGas(weiValue: BigNumber): Promise<{
    estimatedL1Gas: BigNumber
    estimatedL2Gas: BigNumber
    estimatedL2SubmissionCost: BigNumber
  }> {
    if (isDepositMode) {
      const result = await arbTokenBridge.eth.depositEstimateGas(weiValue)
      return result
    }

    const result = await arbTokenBridge.eth.withdrawEstimateGas(weiValue)
    return { ...result, estimatedL2SubmissionCost: BigNumber.from(0) }
  }

  async function setMaxAmount() {
    if (selectedToken) {
      if (!tokenBalance) {
        return
      }

      // For tokens, we can set the max amount, and have the gas summary component handle the rest
      setAmount(utils.formatUnits(tokenBalance, selectedToken?.decimals || 18))
      return
    }

    if (!ethBalance) {
      return
    }

    try {
      setCalculatingMaxAmount(true)
      const result = await estimateGas(ethBalance)

      const estimatedL1GasFees = calculateEstimatedL1GasFees(
        result.estimatedL1Gas,
        l1GasPrice
      )
      const estimatedL2GasFees = calculateEstimatedL2GasFees(
        result.estimatedL2Gas,
        l2GasPrice,
        result.estimatedL2SubmissionCost
      )

      const ethBalanceFloat = parseFloat(utils.formatEther(ethBalance))
      const estimatedTotalGasFees = estimatedL1GasFees + estimatedL2GasFees

      setAmount(String(ethBalanceFloat - estimatedTotalGasFees * 1.4))
    } catch (error) {
      console.error(error)
    } finally {
      setCalculatingMaxAmount(false)
    }
  }

  const balanceMemo = useMemo(() => {
    return (
      <div className="flex flex-col items-end">
        {selectedToken && (
          <>
            {tokenBalance ? (
              <span className="font-light text-white lg:text-xl">
                Balance: {formatBigNumber(tokenBalance, selectedToken.decimals)}{' '}
                {selectedToken?.symbol}
              </span>
            ) : (
              <Loader type="TailSpin" color="white" height={16} width={16} />
            )}
          </>
        )}
        {ethBalance ? (
          <span className="font-light text-white lg:text-xl">
            {selectedToken === null && <span>Balance: </span>}
            {formatBigNumber(ethBalance)} ETH
          </span>
        ) : (
          <Loader type="TailSpin" color="white" height={16} width={16} />
        )}
      </div>
    )
  }, [ethBalance, tokenBalance, selectedToken])

  const shouldShowMaxButton = useMemo(() => {
    if (selectedToken) {
      return tokenBalance && !tokenBalance.isZero()
    }

    return ethBalance && !ethBalance.isZero()
  }, [ethBalance, selectedToken, tokenBalance])

  const networkStyleProps = isL1 ? NetworkStyleProps.L1 : NetworkStyleProps.L2
  const borderClassName =
    typeof errorMessage !== 'undefined'
      ? 'border border-[#cd0000]'
      : 'border border-gray-9'

  return (
    <div
      className={`w-full rounded-xl p-2 ${className} ${networkStyleProps.className}`}
    >
      <div
        className={`p-4 ${networkStyleProps.className}`}
        style={networkStyleProps.style}
      >
        <div className="flex flex-col">
          <div className="flex flex-row justify-between">
            <NetworkInfo isL1={isL1} />
            <div>{balanceMemo}</div>
          </div>
          {canIEnterAmount && (
            <>
              <div className="h-4" />
              <div
                className={`flex h-16 flex-row items-center rounded-lg bg-white ${borderClassName}`}
              >
                <TokenButton />
                <div className="h-full border-r border-gray-4" />
                <div className="flex h-full flex-grow flex-row items-center justify-center px-3">
                  <input
                    autoFocus
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="h-full w-full bg-transparent text-lg font-light placeholder:text-gray-9 lg:text-3xl"
                  />
                  {shouldShowMaxButton && (
                    <MaxButton
                      loading={calculatingMaxAmount}
                      onClick={setMaxAmount}
                    />
                  )}
                </div>
              </div>
              {errorMessageText && (
                <>
                  <div className="h-1" />
                  <span className="text-sm text-brick">{errorMessageText}</span>
                </>
              )}
            </>
          )}
          {isL1 && isDepositMode && selectedToken && (
            <p className="mt-1 text-xs font-light text-white">
              Make sure you have ETH in your L2 wallet, you’ll need it to power
              transactions.
              <br />
              <ExternalLink href="#" className="arb-hover underline">
                Learn more.
              </ExternalLink>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export { NetworkBox }
