import React, { useEffect, useMemo, useState } from 'react'
import { BigNumber, constants, utils } from 'ethers'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useLatest } from 'react-use'
import { useAccount } from 'wagmi'

import { Tooltip } from '../common/Tooltip'
import { useAppState } from '../../state'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { tokenRequiresApprovalOnL2 } from '../../util/L2ApprovalUtils'
import { useGasPrice } from '../../hooks/useGasPrice'
import { depositTokenEstimateGas } from '../../util/TokenDepositUtils'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { withdrawTokenEstimateGas } from '../../util/TokenWithdrawalUtils'
import { withdrawEthEstimateGas } from '../../util/EthWithdrawalUtils'
import {
  isTokenArbitrumGoerliNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  sanitizeTokenSymbol
} from '../../util/TokenUtils'
import { ChainLayer, useChainLayers } from '../../hooks/useChainLayers'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'

export type GasEstimationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'unavailable'

export type GasEstimationResult = {
  estimatedL1Gas: BigNumber
  estimatedL2Gas: BigNumber
  estimatedL2SubmissionCost: BigNumber
}

export type UseGasSummaryResult = {
  status: GasEstimationStatus
  estimatedL1GasFees: number
  estimatedL2GasFees: number
}

const layerToGasFeeTooltip: { [key in ChainLayer]: string } = {
  L1: 'L1 fees go to Ethereum Validators.',
  L2: "L2 fees are collected by the chain to cover costs of execution. This is an estimated fee, if the true fee is lower you'll be refunded.",
  Orbit:
    "Orbit fees are collected by the chain to cover costs of execution. This is an estimated fee, if the true fee is lower you'll be refunded."
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
  const { address: walletAddress } = useAccount()

  const l1GasPrice = useGasPrice({ provider: l1.provider })
  const l2GasPrice = useGasPrice({ provider: l2.provider })

  // Debounce the amount, so we run gas estimation only after the user has stopped typing for a bit
  const amountDebounced = useDebouncedValue(amount, 1500)

  const [status, setStatus] = useState<GasEstimationStatus>('idle')
  const [result, setResult] = useState<GasEstimationResult>({
    // Estimated L1 gas, denominated in Wei, represented as a BigNumber
    estimatedL1Gas: constants.Zero,
    // Estimated L2 gas, denominated in Wei, represented as a BigNumber
    estimatedL2Gas: constants.Zero,
    // Estimated L2 submission cost is precalculated and includes gas price
    estimatedL2SubmissionCost: constants.Zero
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

      if (!walletAddress) {
        return
      }

      try {
        setStatus('loading')

        if (isDepositMode) {
          if (token) {
            const estimateGasResult = await depositTokenEstimateGas({
              amount,
              address: walletAddress,
              erc20L1Address: token.address,
              l1Provider: l1.provider,
              l2Provider: l2.provider
            })

            setResult(estimateGasResult)
          } else {
            const estimateGasResult = await depositEthEstimateGas({
              amount: amountDebounced,
              address: walletAddress,
              l1Provider: l1.provider,
              l2Provider: l2.provider
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
                latestNetworksAndSigners.current.l2.network.id
              )
            ) {
              estimateGasResult = {
                estimatedL1Gas: BigNumber.from(5_000),
                estimatedL2Gas: BigNumber.from(10_000)
              }
            } else if (
              isTokenArbitrumOneNativeUSDC(token.address) ||
              isTokenArbitrumGoerliNativeUSDC(token.address)
            ) {
              estimateGasResult = {
                estimatedL1Gas: constants.Zero,
                estimatedL2Gas: constants.Zero
              }
              setStatus('unavailable')
              return
            } else {
              estimateGasResult = await withdrawTokenEstimateGas({
                amount: amountDebounced,
                erc20L1Address: token.address,
                address: walletAddress,
                l2Provider: l2.provider
              })
            }

            setResult({
              ...estimateGasResult,
              estimatedL2SubmissionCost: constants.Zero
            })
          } else {
            const estimateGasResult = await withdrawEthEstimateGas({
              amount: amountDebounced,
              address: walletAddress,
              l2Provider: l2.provider
            })

            setResult({
              ...estimateGasResult,
              estimatedL2SubmissionCost: constants.Zero
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Re-run gas estimation when:
    isDepositMode, // when user switches deposit/withdraw mode
    amount, // when user changes the amount (check against the debounced value)
    amountDebounced,
    token, // when the token changes
    shouldRunGasEstimation, // passed externally - estimate gas only if user balance crosses a threshold
    l1.network.id, // when L1 and L2 network id changes
    l2.network.id,
    walletAddress // when user switches account or if user is not connected
  ])

  return {
    status,
    estimatedL1GasFees,
    estimatedL2GasFees
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
        <span className="text-xl text-gray-dark lg:text-2xl">Summary</span>
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
  const { status, estimatedL1GasFees, estimatedL2GasFees } = gasSummary

  const { app } = useAppState()
  const { ethToUSD } = useETHPrice()
  const { l1, l2 } = useNetworksAndSigners()
  const { parentLayer, layer } = useChainLayers()

  const nativeCurrency = useNativeCurrency({ provider: l2.provider })
  const parentChainNativeCurrency = useNativeCurrency({ provider: l1.provider })

  const isBridgingETH = token === null && !nativeCurrency.isCustom
  const showPrice = isBridgingETH && !isNetwork(l1.network.id).isTestnet

  const tokenSymbol = useMemo(() => {
    if (token) {
      return sanitizeTokenSymbol(token.symbol, {
        erc20L1Address: token.address,
        chain: app.isDepositMode ? l1.network : l2.network
      })
    }

    return nativeCurrency.symbol
  }, [token, nativeCurrency, app.isDepositMode, l1.network, l2.network])

  const sameNativeCurrency = useMemo(
    // we'll have to change this if we ever have L4s that are built on top of L3s with a custom fee token
    () => nativeCurrency.isCustom === parentChainNativeCurrency.isCustom,
    [nativeCurrency, parentChainNativeCurrency]
  )

  const estimatedTotalGasFees = useMemo(
    () => estimatedL1GasFees + estimatedL2GasFees,
    [estimatedL1GasFees, estimatedL2GasFees]
  )

  if (status === 'loading') {
    const bgClassName = app.isDepositMode ? 'bg-ocl-blue' : 'bg-eth-dark'

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

        {isBridgingETH && (
          <>
            <div>
              <div className="h-2" />
              <div className="lg:border-b lg:border-gray-2" />
              <div className="h-2" />
            </div>
            <div className={`h-[28px] w-full opacity-10 ${bgClassName}`} />
          </>
        )}
      </TransferPanelSummaryContainer>
    )
  }

  if (status === 'unavailable') {
    return (
      <TransferPanelSummaryContainer>
        <div className="flex flex-row justify-between text-sm text-gray-dark lg:text-base">
          Gas estimates are not available for this action.
        </div>
        <div className="flex flex-row justify-between text-sm text-gray-dark lg:text-base">
          <span className="w-2/5 font-light">You&apos;re moving</span>
          <div className="flex w-3/5 flex-row justify-between">
            <span>
              {formatAmount(amount, {
                symbol: tokenSymbol
              })}
            </span>
          </div>
        </div>
      </TransferPanelSummaryContainer>
    )
  }

  return (
    <TransferPanelSummaryContainer>
      <div className="flex flex-row justify-between text-sm text-gray-dark lg:text-base">
        <span className="w-2/5 font-light">You&apos;re moving</span>
        <div className="flex w-3/5 flex-row justify-between">
          <span>
            {formatAmount(amount, {
              symbol: tokenSymbol
            })}
          </span>

          {showPrice && (
            <span className="font-medium text-dark">
              {formatUSD(ethToUSD(amount))}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-row items-center justify-between text-sm text-gray-dark lg:text-base">
        <span className="w-2/5 font-light">You&apos;ll pay in gas fees</span>
        <div className="flex w-3/5 justify-between">
          {sameNativeCurrency ? (
            <>
              <span>
                {formatAmount(estimatedTotalGasFees, {
                  symbol: nativeCurrency.symbol
                })}
              </span>

              {showPrice && (
                <span className="font-medium text-dark">
                  {formatUSD(ethToUSD(estimatedTotalGasFees))}
                </span>
              )}
            </>
          ) : (
            <span>
              {formatAmount(estimatedL1GasFees, {
                symbol: parentChainNativeCurrency.symbol
              })}
              {' + '}
              {formatAmount(estimatedL2GasFees, {
                symbol: nativeCurrency.symbol
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-2 text-sm text-gray-dark lg:text-base">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row items-center space-x-2">
            <span className="pl-4 font-light">{parentLayer} gas</span>
            <Tooltip content={layerToGasFeeTooltip[parentLayer]}>
              <InformationCircleIcon className="h-4 w-4" />
            </Tooltip>
          </div>
          <div className="flex w-3/5 flex-row justify-between">
            <span className="font-light">
              {formatAmount(estimatedL1GasFees, {
                symbol: parentChainNativeCurrency.symbol
              })}
            </span>

            {showPrice && (
              <span className="font-light">
                {formatUSD(ethToUSD(estimatedL1GasFees))}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-row justify-between text-gray-dark">
          <div className="flex flex-row items-center space-x-2">
            <span className="pl-4 font-light ">{layer} gas</span>
            <Tooltip content={layerToGasFeeTooltip[layer]}>
              <InformationCircleIcon className="h-4 w-4 " />
            </Tooltip>
          </div>
          <div className="flex w-3/5 flex-row justify-between">
            <span className="font-light">
              {formatAmount(estimatedL2GasFees, {
                symbol: nativeCurrency.symbol
              })}
            </span>

            {showPrice && (
              <span className="font-light">
                {formatUSD(ethToUSD(estimatedL2GasFees))}
              </span>
            )}
          </div>
        </div>
      </div>

      {isBridgingETH && (
        <>
          <div>
            <div className="h-2" />
            <div className="border-b border-gray-5" />
            <div className="h-2" />
          </div>
          <div className="flex flex-row justify-between text-sm text-gray-dark lg:text-base">
            <span className="w-2/5 font-light text-gray-dark">
              Total amount
            </span>
            <div className="flex w-3/5 flex-row justify-between">
              <span>
                {formatAmount(amount + estimatedTotalGasFees, {
                  symbol: nativeCurrency.symbol
                })}
              </span>

              {showPrice && (
                <span className="font-medium text-dark">
                  {formatUSD(ethToUSD(amount + estimatedTotalGasFees))}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </TransferPanelSummaryContainer>
  )
}
