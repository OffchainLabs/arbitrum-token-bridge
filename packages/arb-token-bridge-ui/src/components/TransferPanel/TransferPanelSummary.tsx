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
import { NativeCurrencyPrice, useIsBridgingEth } from './NativeCurrencyPrice'
import { isTokenUSDC } from '../../util/TokenUtils'
import { useAppState } from '../../state'

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

function TransferPanelSummaryUnavailable() {
  return (
    <TransferPanelSummaryContainer>
      <div className="flex flex-row justify-between text-sm text-gray-dark lg:text-base">
        Gas estimates are not available for this action.
      </div>
    </TransferPanelSummaryContainer>
  )
}

export function TransferPanelSummary({ token }: TransferPanelSummaryProps) {
  const {
    app: { selectedToken }
  } = useAppState()

  const {
    status: gasSummaryStatus,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  } = useGasSummary()

  const [networks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChain,
    parentChainProvider,
    isDepositMode
  } = useNetworksRelationship(networks)

  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })
  const parentChainNativeCurrency = useNativeCurrency({
    provider: parentChainProvider
  })

  const isBridgingEth = useIsBridgingEth()

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
    () =>
      childChainNativeCurrency.isCustom === parentChainNativeCurrency.isCustom,
    [childChainNativeCurrency, parentChainNativeCurrency]
  )

  const estimatedTotalGasFees = useMemo(
    () => estimatedParentChainGasFees + estimatedChildChainGasFees,
    [estimatedParentChainGasFees, estimatedChildChainGasFees]
  )

  if (gasSummaryStatus === 'unavailable') {
    return <TransferPanelSummaryUnavailable />
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
              {formatAmount(estimatedParentChainGasFees, {
                symbol: parentChainNativeCurrency.symbol
              })}{' '}
              <NativeCurrencyPrice
                amount={estimatedTotalGasFees}
                showBrackets
              />
              {selectedToken && ' and '}
            </>
          )}
          {!sameNativeCurrency &&
            (selectedToken || !isDepositMode) &&
            formatAmount(estimatedChildChainGasFees, {
              symbol: childChainNativeCurrency.symbol
            })}
          {sameNativeCurrency && (
            <>
              {formatAmount(estimatedTotalGasFees, {
                symbol: childChainNativeCurrency.symbol
              })}{' '}
              <NativeCurrencyPrice
                amount={estimatedTotalGasFees}
                showBrackets
              />
            </>
          )}{' '}
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
          {isBridgingEth && (
            <NativeCurrencyPrice amount={Number(amount)} showBrackets />
          )}
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
