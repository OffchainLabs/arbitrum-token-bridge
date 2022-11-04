import React, { useEffect, useMemo, useState } from 'react'
import { BigNumber, utils } from 'ethers'
import { InformationCircleIcon } from '@heroicons/react/outline'
import { useLatest } from 'react-use'
import { useGasPrice } from 'token-bridge-sdk'

import { Tooltip } from '../common/Tooltip'
import { useAppState } from '../../state'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { tokenRequiresApprovalOnL2 } from '../../util/L2ApprovalUtils'

export type GasEstimationStatus = 'idle' | 'loading' | 'success' | 'error'

export type GasEstimationResult = {
  estimatedL1Gas: BigNumber
  estimatedL2Gas: BigNumber
  estimatedL2SubmissionCost: BigNumber
}

export type UseGasSummaryResult = {
  status: GasEstimationStatus
  estimatedL1GasFees: number
  estimatedL2GasFees: number
  estimatedTotalGasFees: number
}

export function useGasSummary(
  amount: BigNumber,
  token: TransferPanelSummaryToken | null,
  shouldRunGasEstimation: boolean
): UseGasSummaryResult {
  const {
    app: { arbTokenBridge, isDepositMode }
  } = useAppState()

  const networksAndSigners = useNetworksAndSigners()
  const { l1, l2 } = networksAndSigners
  const latestNetworksAndSigners = useLatest(networksAndSigners)

  const l1GasPrice = useGasPrice({ provider: l1.provider })
  const l2GasPrice = useGasPrice({ provider: l2.provider })

  // Debounce the amount, so we run gas estimation only after the user has stopped typing for a bit
  const amountDebounced = useDebouncedValue(amount, 1500)

  const [status, setStatus] = useState<GasEstimationStatus>('idle')
  const [result, setResult] = useState<GasEstimationResult>({
    // Estimated L1 gas, denominated in Wei, represented as a BigNumber
    estimatedL1Gas: BigNumber.from(0),
    // Estimated L2 gas, denominated in Wei, represented as a BigNumber
    estimatedL2Gas: BigNumber.from(0),
    // Estimated L2 submission cost is precalculated and includes gas price
    estimatedL2SubmissionCost: BigNumber.from(0)
  })

  // Estimated L1 gas fees, denominated in Ether, represented as a floating point number
  const estimatedL1GasFees = useMemo(
    () => parseFloat(utils.formatEther(result.estimatedL1Gas.mul(l1GasPrice))),
    [result.estimatedL1Gas, l1GasPrice]
  )

  // Estimated L2 gas fees, denominated in Ether, represented as a floating point number
  const estimatedL2GasFees = useMemo(
    () =>
      parseFloat(
        utils.formatEther(
          result.estimatedL2Gas
            .mul(l2GasPrice)
            .add(result.estimatedL2SubmissionCost)
        )
      ),
    [result.estimatedL2Gas, l2GasPrice, result.estimatedL2SubmissionCost]
  )

  const estimatedTotalGasFees = useMemo(
    () => estimatedL1GasFees + estimatedL2GasFees,
    [estimatedL1GasFees, estimatedL2GasFees]
  )

  useEffect(() => {
    // When the user starts typing, set the status to `loading` for better UX
    // The value is debounced, so we'll start fetching the gas estimates only when the user stops typing
    if (shouldRunGasEstimation) {
      setStatus('loading')
    }
  }, [amount, shouldRunGasEstimation])

  useEffect(() => {
    async function estimateGas() {
      // Since we are using a debounced value, it's possible for the value to be outdated
      // Wait for it to sync before running the gas estimation
      if (!amountDebounced.eq(amount)) {
        return
      }

      // Don't run gas estimation if the value is zero or the flag is not set
      if (amountDebounced.isZero() || !shouldRunGasEstimation) {
        setStatus('idle')
        return
      }

      try {
        setStatus('loading')

        if (isDepositMode) {
          if (token) {
            const estimateGasResult =
              await arbTokenBridge.token.depositEstimateGas({
                erc20L1Address: token.address,
                amount: amountDebounced
              })

            setResult(estimateGasResult)
          } else {
            const estimateGasResult =
              await arbTokenBridge.eth.depositEstimateGas({
                amount: amountDebounced
              })

            setResult(estimateGasResult)
          }
        } else {
          if (token) {
            let estimateGasResult: {
              estimatedL1Gas: BigNumber
              estimatedL2Gas: BigNumber
            }

            // TODO: Update, as this only handles LPT
            if (
              tokenRequiresApprovalOnL2(
                token.address,
                latestNetworksAndSigners.current.l2.network.chainID
              )
            ) {
              estimateGasResult = {
                estimatedL1Gas: BigNumber.from(5_000),
                estimatedL2Gas: BigNumber.from(10_000)
              }
            } else {
              estimateGasResult =
                await arbTokenBridge.token.withdrawEstimateGas({
                  erc20L1Address: token.address,
                  amount: amountDebounced
                })
            }

            setResult({
              ...estimateGasResult,
              estimatedL2SubmissionCost: BigNumber.from(0)
            })
          } else {
            const estimateGasResult =
              await arbTokenBridge.eth.withdrawEstimateGas({
                amount: amountDebounced
              })

            setResult({
              ...estimateGasResult,
              estimatedL2SubmissionCost: BigNumber.from(0)
            })
          }
        }

        setStatus('success')
      } catch (error) {
        console.error(error)
        setStatus('error')
      }
    }

    if (arbTokenBridge && arbTokenBridge.eth && arbTokenBridge.token) {
      estimateGas()
    }
  }, [
    isDepositMode,
    amount,
    amountDebounced,
    token,
    shouldRunGasEstimation,
    latestNetworksAndSigners
  ])

  return {
    status,
    estimatedL1GasFees,
    estimatedL2GasFees,
    estimatedTotalGasFees
  }
}

export type TransferPanelSummaryToken = { symbol: string; address: string }

export type TransferPanelSummaryProps = {
  amount: number
  token: TransferPanelSummaryToken | null
  gasSummary: UseGasSummaryResult
}

function TransferPanelSummaryContainer({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <>
      <div className="block lg:hidden">
        <span className="text-2xl">Summary</span>
        <div className="h-4" />
      </div>

      <div
        className={`flex flex-col space-y-4 text-lg lg:min-h-[257px] ${className}`}
      >
        {children}
      </div>

      <div className="h-10" />
    </>
  )
}

export function TransferPanelSummary({
  amount,
  token,
  gasSummary
}: TransferPanelSummaryProps) {
  const isETH = token === null
  const {
    status,
    estimatedL1GasFees,
    estimatedL2GasFees,
    estimatedTotalGasFees
  } = gasSummary

  const { app } = useAppState()
  const { toUSD } = useETHPrice()
  const { l1 } = useNetworksAndSigners()

  const { isMainnet } = isNetwork(l1.network.chainID)

  if (status === 'loading') {
    const bgClassName = app.isDepositMode
      ? 'bg-blue-arbitrum'
      : 'bg-purple-ethereum'

    return (
      <TransferPanelSummaryContainer className="animate-pulse">
        <div className={`h-[28px] w-full opacity-10 ${bgClassName}`} />
        <div
          className={`h-[28px] w-full opacity-10 lg:h-[56px] ${bgClassName}`}
        />
        <div className="flex flex-col space-y-2 pl-4">
          <div className={`h-[28px] w-full opacity-10 ${bgClassName}`} />
          <div className={`h-[28px] w-full opacity-10 ${bgClassName}`} />
        </div>

        {isETH && (
          <>
            <div>
              <div className="h-2" />
              <div className="lg:border-b lg:border-gray-3" />
              <div className="h-2" />
            </div>
            <div className={`h-[28px] w-full opacity-10 ${bgClassName}`} />
          </>
        )}
      </TransferPanelSummaryContainer>
    )
  }

  return (
    <TransferPanelSummaryContainer>
      <div className="flex flex-row justify-between">
        <span className="w-2/5 font-light text-dark">You’re moving</span>
        <div className="flex w-3/5 flex-row justify-between">
          <span className="text-dark">
            {formatAmount(amount, { symbol: token?.symbol || 'ETH' })}
          </span>
          {/* Only show USD price for ETH */}
          {isETH && isMainnet && (
            <span className="font-medium text-dark">
              {formatUSD(toUSD(amount))}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-row items-center justify-between">
        <span className="w-2/5 font-light text-dark">
          You’ll pay in gas fees
        </span>
        <div className="flex w-3/5 justify-between">
          <span className="text-dark">
            {formatAmount(estimatedTotalGasFees, {
              symbol: 'ETH'
            })}
          </span>
          {isMainnet && (
            <span className="font-medium text-dark">
              {formatUSD(toUSD(estimatedTotalGasFees))}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row items-center space-x-2">
            <span className="pl-4 font-light text-[#595959]">L1 gas</span>
            <Tooltip content="L1 fees go to Ethereum miners.">
              <InformationCircleIcon className="h-4 w-4 text-[#595959]" />
            </Tooltip>
          </div>
          <div className="flex w-3/5 flex-row justify-between">
            <span className="font-light text-[#595959]">
              {formatAmount(estimatedL1GasFees, {
                symbol: 'ETH'
              })}
            </span>
            {isMainnet && (
              <span className="font-light text-[#595959]">
                ({formatUSD(toUSD(estimatedL1GasFees))})
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-row justify-between">
          <div className="flex flex-row items-center space-x-2">
            <span className="pl-4 font-light text-[#595959]">L2 gas</span>
            <Tooltip content="L2 fees go to L2 validators to track chain state and execute transactions. This is actually an estimated fee. If the true fee is lower, you will be refunded.">
              <InformationCircleIcon className="h-4 w-4 text-[#595959]" />
            </Tooltip>
          </div>
          <div className="flex w-3/5 flex-row justify-between">
            <span className="font-light text-[#595959]">
              {formatAmount(estimatedL2GasFees, {
                symbol: 'ETH'
              })}
            </span>
            {isMainnet && (
              <span className="font-light text-[#595959]">
                ({formatUSD(toUSD(estimatedL2GasFees))})
              </span>
            )}
          </div>
        </div>
      </div>

      {isETH && (
        <>
          <div>
            <div className="h-2" />
            <div className="lg:border-b lg:border-gray-3" />
            <div className="h-2" />
          </div>
          <div className="flex flex-row justify-between">
            <span className="w-2/5 font-light text-dark">Total amount</span>
            <div className="flex w-3/5 flex-row justify-between">
              <span className="text-dark">
                {formatAmount(amount + estimatedTotalGasFees, {
                  symbol: 'ETH'
                })}
              </span>
              {isMainnet && (
                <span className="font-medium text-dark">
                  {formatUSD(toUSD(amount + estimatedTotalGasFees))}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </TransferPanelSummaryContainer>
  )
}
