import React, { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { useAppState } from '../../state'
import { useETHPrice } from '../../hooks/useETHPrice'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useGasSummaryStore } from '../../hooks/TransferPanel/useGasSummaryStore'

export type TransferPanelSummaryToken = { symbol: string; address: string }

export type TransferPanelSummaryProps = {
  amount: number
  token: TransferPanelSummaryToken | null
}

function TransferPanelSummaryContainer({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex flex-col px-6">
      <span className="mb-4 text-xl text-gray-dark lg:text-2xl">Summary</span>

      <div className={twMerge('flex flex-col space-y-4', className)}>
        {children}
      </div>

      <div className="h-10" />
    </div>
  )
}

export function TransferPanelSummary({ token }: TransferPanelSummaryProps) {
  const {
    gasSummary: { status, estimatedL1GasFees, estimatedL2GasFees }
  } = useGasSummaryStore()

  const {
    app: { isDepositMode }
  } = useAppState()
  const { ethToUSD } = useETHPrice()
  const { l1, l2 } = useNetworksAndSigners()

  const nativeCurrency = useNativeCurrency({ provider: l2.provider })
  const parentChainNativeCurrency = useNativeCurrency({ provider: l1.provider })

  const isBridgingETH = token === null && !nativeCurrency.isCustom
  const showPrice = isBridgingETH && !isNetwork(l1.network.id).isTestnet

  const sameNativeCurrency = useMemo(
    // we'll have to change this if we ever have L4s that are built on top of L3s with a custom fee token
    () => nativeCurrency.isCustom === parentChainNativeCurrency.isCustom,
    [nativeCurrency, parentChainNativeCurrency]
  )

  const estimatedTotalGasFees = useMemo(
    () => estimatedL1GasFees + estimatedL2GasFees,
    [estimatedL1GasFees, estimatedL2GasFees]
  )

  if (status === 'idle') {
    return null
  }

  if (status === 'loading') {
    const bgClassName = isDepositMode ? 'bg-ocl-blue' : 'bg-eth-dark'

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
            <div className="lg:border-b lg:border-gray-2" />
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
      </TransferPanelSummaryContainer>
    )
  }

  return (
    <TransferPanelSummaryContainer>
      <div
        className={twMerge(
          'grid items-center justify-between text-right text-sm font-light tabular-nums text-gray-dark',
          showPrice ? 'grid-cols-[2fr_1fr_1fr]' : ' grid-cols-[2fr_1fr]'
        )}
      >
        <span className="text-left">You&apos;ll now pay in gas fees</span>
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

      {!isDepositMode && (
        <>
          <div className="border-b border-gray-5" />
          <div className="flex flex-col gap-3 text-sm font-light text-gray-dark lg:text-base">
            <p>
              This transaction will initiate the withdrawal on {l2.network.name}
              .
            </p>
            <p>
              When the withdrawal is ready for claiming on {l1.network.name},
              you will have to pay gas fees for the claim transaction.
            </p>
          </div>
        </>
      )}
    </TransferPanelSummaryContainer>
  )
}
