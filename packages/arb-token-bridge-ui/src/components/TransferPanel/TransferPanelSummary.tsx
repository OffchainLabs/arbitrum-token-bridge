import React from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

import { Tooltip } from '../common/Tooltip'
import { useAppState } from '../../state'
import { useETHPrice } from '../../hooks/useETHPrice'

import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { UseGasSummaryResult } from '../../hooks/useGasEstimationSummary'

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
        <span className="text-xl text-gray-10 lg:text-2xl">Summary</span>
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
  const { ethToUSD } = useETHPrice()
  const { l1 } = useNetworksAndSigners()

  const { isMainnet } = isNetwork(l1.network.id)

  if (status === 'loading') {
    const bgClassName = app.isDepositMode ? 'bg-blue-arbitrum' : 'bg-eth-dark'

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
      <div className="flex flex-row justify-between text-sm text-gray-10 lg:text-base">
        <span className="w-2/5 font-light">You’re moving</span>
        <div className="flex w-3/5 flex-row justify-between">
          <span>
            {formatAmount(amount, { symbol: token?.symbol || 'ETH' })}
          </span>
          {/* Only show USD price for ETH */}
          {isETH && isMainnet && (
            <span className="font-medium text-dark">
              {formatUSD(ethToUSD(amount))}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-row items-center justify-between text-sm text-gray-10 lg:text-base">
        <span className="w-2/5 font-light">You’ll pay in gas fees</span>
        <div className="flex w-3/5 justify-between">
          <span>
            {formatAmount(estimatedTotalGasFees, {
              symbol: 'ETH'
            })}
          </span>
          {isMainnet && (
            <span className="font-medium text-dark">
              {formatUSD(ethToUSD(estimatedTotalGasFees))}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-2 text-sm text-gray-9 lg:text-base">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row items-center space-x-2">
            <span className="pl-4 font-light">L1 gas</span>
            <Tooltip content="L1 fees go to Ethereum Validators.">
              <InformationCircleIcon className="h-4 w-4" />
            </Tooltip>
          </div>
          <div className="flex w-3/5 flex-row justify-between">
            <span className="font-light">
              {formatAmount(estimatedL1GasFees, {
                symbol: 'ETH'
              })}
            </span>
            {isMainnet && (
              <span className="font-light">
                {formatUSD(ethToUSD(estimatedL1GasFees))}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-row justify-between text-gray-9">
          <div className="flex flex-row items-center space-x-2">
            <span className="pl-4 font-light ">L2 gas</span>
            <Tooltip content="L2 fees go to L2 validators to track chain state and execute transactions. This is actually an estimated fee. If the true fee is lower, you will be refunded.">
              <InformationCircleIcon className="h-4 w-4 " />
            </Tooltip>
          </div>
          <div className="flex w-3/5 flex-row justify-between">
            <span className="font-light">
              {formatAmount(estimatedL2GasFees, {
                symbol: 'ETH'
              })}
            </span>
            {isMainnet && (
              <span className="font-light">
                {formatUSD(ethToUSD(estimatedL2GasFees))}
              </span>
            )}
          </div>
        </div>
      </div>

      {isETH && (
        <>
          <div>
            <div className="h-2" />
            <div className="border-b border-gray-10" />
            <div className="h-2" />
          </div>
          <div className="flex flex-row justify-between text-sm text-gray-10 lg:text-base">
            <span className="w-2/5 font-light text-gray-9">Total amount</span>
            <div className="flex w-3/5 flex-row justify-between">
              <span>
                {formatAmount(amount + estimatedTotalGasFees, {
                  symbol: 'ETH'
                })}
              </span>
              {isMainnet && (
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
