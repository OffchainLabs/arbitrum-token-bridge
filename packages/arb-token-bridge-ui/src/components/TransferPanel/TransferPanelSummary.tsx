import React, { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { useAppState } from '../../state'
import { useETHPrice } from '../../hooks/useETHPrice'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { getNetworkName, isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useGasSummaryStore } from '../../hooks/TransferPanel/useGasSummaryStore'
import { useWithdrawalConfirmationPeriod } from '../../util/WithdrawalUtils'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { TokenSymbolWithExplorerLink } from '../common/TokenSymbolWithExplorerLink'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'

export type TransferPanelSummaryProps = {
  amount: number
  token: ERC20BridgeToken | null
}

function TransferPanelSummaryContainer({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex flex-col">
      <span className="mb-4 text-xl text-gray-dark">Summary</span>

      <div className={twMerge('flex flex-col space-y-4', className)}>
        {children}
      </div>

      <div className="h-10" />
    </div>
  )
}

export function TransferPanelSummary({ token }: TransferPanelSummaryProps) {
  const {
    gasSummaryStatus,
    gasSummary: { estimatedL1GasFees, estimatedL2GasFees }
  } = useGasSummaryStore()

  const {
    app: { isDepositMode }
  } = useAppState()
  const { ethToUSD } = useETHPrice()
  const { l1, l2 } = useNetworksAndSigners()

  const nativeCurrency = useNativeCurrency({ provider: l2.provider })
  const parentChainNativeCurrency = useNativeCurrency({ provider: l1.provider })

  const [{ amount }] = useArbQueryParams()

  const { confirmationPeriod } = useWithdrawalConfirmationPeriod()

  const isBridgingEth = token === null && !nativeCurrency.isCustom
  const showPrice = isBridgingEth && !isNetwork(l1.network.id).isTestnet

  const sameNativeCurrency = useMemo(
    // we'll have to change this if we ever have L4s that are built on top of L3s with a custom fee token
    () => nativeCurrency.isCustom === parentChainNativeCurrency.isCustom,
    [nativeCurrency, parentChainNativeCurrency]
  )

  const estimatedTotalGasFees = useMemo(
    () => estimatedL1GasFees + estimatedL2GasFees,
    [estimatedL1GasFees, estimatedL2GasFees]
  )

  if (gasSummaryStatus === 'loading') {
    const bgClassName = isDepositMode ? 'bg-ocl-blue' : 'bg-eth-dark'

    return (
      <TransferPanelSummaryContainer className="animate-pulse">
        <div className={twMerge('h-[20px] w-full opacity-10', bgClassName)} />
        <div className={twMerge('h-[20px] w-full opacity-10', bgClassName)} />
        {!isDepositMode && (
          <div className={twMerge('h-[20px] w-full opacity-10', bgClassName)} />
        )}
      </TransferPanelSummaryContainer>
    )
  }

  if (gasSummaryStatus === 'unavailable') {
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
          'grid grid-cols-[260px_auto] items-center text-sm font-light tabular-nums text-gray-dark'
        )}
      >
        <span className="text-left">You will pay in gas fees:</span>

        <span className="font-medium">
          {!sameNativeCurrency && isDepositMode && (
            <>
              {formatAmount(estimatedL1GasFees, {
                symbol: parentChainNativeCurrency.symbol
              })}
              {' + '}
            </>
          )}
          {formatAmount(
            sameNativeCurrency ? estimatedTotalGasFees : estimatedL2GasFees,
            {
              symbol: nativeCurrency.symbol
            }
          )}{' '}
          {showPrice && <>({formatUSD(ethToUSD(estimatedTotalGasFees))})</>}
        </span>
      </div>

      <div
        className={twMerge(
          'grid grid-cols-[260px_auto] items-center text-sm font-light tabular-nums text-gray-dark'
        )}
      >
        <span>
          You will receive on{' '}
          {getNetworkName(isDepositMode ? l2.network.id : l1.network.id)}:
        </span>
        <span className="font-medium">
          {formatAmount(Number(amount))}{' '}
          <TokenSymbolWithExplorerLink
            token={token}
            isParentChain={!isDepositMode}
          />{' '}
          {showPrice && <>({formatUSD(ethToUSD(Number(amount)))})</>}
        </span>
      </div>

      {!isDepositMode && (
        <p className="flex flex-col gap-3 text-sm font-light text-gray-dark">
          You will have to claim the withdrawal on {l1.network.name} in ~
          {confirmationPeriod}.
        </p>
      )}
    </TransferPanelSummaryContainer>
  )
}
