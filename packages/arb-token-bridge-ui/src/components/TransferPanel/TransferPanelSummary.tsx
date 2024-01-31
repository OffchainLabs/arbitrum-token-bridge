import React, { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { formatAmount } from '../../util/NumberUtils'
import { getBaseChainIdByChainId, getNetworkName } from '../../util/networks'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useGasSummary } from '../../hooks/TransferPanel/useGasSummary'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { TokenSymbolWithExplorerLink } from '../common/TokenSymbolWithExplorerLink'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import dayjs from 'dayjs'
import { getTxConfirmationDate } from '../common/WithdrawalCountdown'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { NativeCurrencyPrice } from './NativeCurrencyPrice'
import { isTokenUSDC } from '../../util/TokenUtils'

export type TransferPanelSummaryToken = { symbol: string; address: string }

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
  } = useGasSummary()

  const [networks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChain,
    parentChainProvider,
    isDepositMode
  } = useNetworksRelationship(networks)

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const parentChainNativeCurrency = useNativeCurrency({
    provider: parentChainProvider
  })

  const [{ amount }] = useArbQueryParams()

  const baseChainId = getBaseChainIdByChainId({
    chainId: childChain.id
  })

  const estimatedConfirmationDate = getTxConfirmationDate({
    createdAt: dayjs(new Date()),
    withdrawalFromChainId: childChain.id,
    baseChainId
  })

  const confirmationPeriod = estimatedConfirmationDate.fromNow(true)

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
          <NativeCurrencyPrice amount={estimatedTotalGasFees} showBrackets />
        </span>
      </div>

      <div
        className={twMerge(
          'grid grid-cols-[260px_auto] items-center text-sm font-light tabular-nums text-gray-dark'
        )}
      >
        <span>
          You will receive on{' '}
          {getNetworkName(isDepositMode ? childChain.id : parentChain.id)}:
        </span>
        <span className="font-medium">
          {formatAmount(Number(amount))}{' '}
          <TokenSymbolWithExplorerLink
            token={token}
            isParentChain={!isDepositMode}
          />{' '}
          {isTokenUSDC(token?.address) && isDepositMode && <>or USDC</>}
          <NativeCurrencyPrice amount={Number(amount)} showBrackets />
        </span>
      </div>

      {!isDepositMode && (
        <p className="flex flex-col gap-3 text-sm font-light text-gray-dark">
          You will have to claim the withdrawal on {parentChain.name} in ~
          {confirmationPeriod}.
        </p>
      )}
    </TransferPanelSummaryContainer>
  )
}
