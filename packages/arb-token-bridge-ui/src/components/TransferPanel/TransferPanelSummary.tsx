import React, { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { formatAmount } from '../../util/NumberUtils'
import { getNetworkName, isNetwork } from '../../util/networks'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useGasSummary } from '../../hooks/TransferPanel/useGasSummary'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { TokenSymbolWithExplorerLink } from '../common/TokenSymbolWithExplorerLink'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { NativeCurrencyPrice, useIsBridgingEth } from './NativeCurrencyPrice'
import { Loader } from '../common/atoms/Loader'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { NoteBox } from '../common/NoteBox'
import { DISABLED_CHAIN_IDS } from './useTransferReadiness'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useIsBatchTransferSupported } from '../../hooks/TransferPanel/useIsBatchTransferSupported'

export type TransferPanelSummaryToken = {
  symbol: string
  address: string
  l2Address?: string
}

export type TransferPanelSummaryProps = {
  amount: number
  token: ERC20BridgeToken | null
}

function StyledLoader() {
  return (
    <span className="flex">
      <Loader size="small" />
    </span>
  )
}

function TotalGasFees() {
  const [selectedToken] = useSelectedToken()

  const {
    status: gasSummaryStatus,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  } = useGasSummary()

  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)

  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })
  const parentChainNativeCurrency = useNativeCurrency({
    provider: parentChainProvider
  })

  const gasSummaryLoading = gasSummaryStatus === 'loading'

  const sameNativeCurrency = useMemo(
    // we'll have to change this if we ever have L4s that are built on top of L3s with a custom fee token
    () =>
      childChainNativeCurrency.isCustom === parentChainNativeCurrency.isCustom,
    [childChainNativeCurrency, parentChainNativeCurrency]
  )

  const estimatedTotalGasFees = useMemo(() => {
    if (
      gasSummaryStatus === 'loading' ||
      typeof estimatedChildChainGasFees == 'undefined' ||
      typeof estimatedParentChainGasFees == 'undefined'
    ) {
      return undefined
    }

    return estimatedParentChainGasFees + estimatedChildChainGasFees
  }, [
    gasSummaryStatus,
    estimatedChildChainGasFees,
    estimatedParentChainGasFees
  ])

  if (gasSummaryLoading) {
    return <StyledLoader />
  }

  /**
   * Same Native Currencies between Parent and Child chains
   * 1. ETH/ER20 deposit: L1->L2
   * 2. ETH/ERC20 withdrawal: L2->L1
   * 3. ETH/ER20 deposit: L2->L3 (ETH as gas token)
   * 4. ETH/ERC20 withdrawal: L3 (ETH as gas token)->L2
   *
   * x ETH
   */
  if (sameNativeCurrency) {
    return (
      <span className="tabular-nums">
        {formatAmount(estimatedTotalGasFees, {
          symbol: childChainNativeCurrency.symbol
        })}{' '}
        <NativeCurrencyPrice amount={estimatedTotalGasFees} showBrackets />
      </span>
    )
  }
  /** Different Native Currencies between Parent and Child chains
   *
   *  Custom gas token deposit: L2->Xai
   *  x ETH
   *
   *  ERC20 deposit: L2->Xai
   *  x ETH and x XAI
   *
   *  Custom gas token/ERC20 withdrawal: L3->L2
   *  only show child chain native currency
   *  x XAI
   */
  return (
    <>
      {isDepositMode && (
        <span className="tabular-nums">
          {formatAmount(estimatedParentChainGasFees, {
            symbol: parentChainNativeCurrency.symbol
          })}{' '}
          <NativeCurrencyPrice
            amount={estimatedParentChainGasFees}
            showBrackets
          />
          {selectedToken && ' and '}
        </span>
      )}
      {(selectedToken || !isDepositMode) &&
        formatAmount(estimatedChildChainGasFees, {
          symbol: childChainNativeCurrency.symbol
        })}
    </>
  )
}

function TransferPanelSummaryContainer({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)

  const isDisabled = DISABLED_CHAIN_IDS.includes(childChain.id)

  return (
    <div className="mb-8 flex flex-col text-white">
      <span className="mb-3 text-xl">Summary</span>
      <div className={twMerge('mb-3 flex flex-col space-y-3', className)}>
        {children}
      </div>
      {isDisabled && (
        <NoteBox variant="error">
          {getNetworkName(childChain.id)} is currently down. You will be able to
          bridge again once it is back online.
        </NoteBox>
      )}
    </div>
  )
}

export function TransferPanelSummary({ token }: TransferPanelSummaryProps) {
  const { status: gasSummaryStatus } = useGasSummary()

  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)

  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })

  const isBridgingEth = useIsBridgingEth(childChainNativeCurrency)

  const [{ amount, amount2 }] = useArbQueryParams()
  const isBatchTransferSupported = useIsBatchTransferSupported()

  const {
    isArbitrumOne: isDestinationChainArbitrumOne,
    isArbitrumSepolia: isDestinationChainArbitrumSepolia
  } = isNetwork(networks.destinationChain.id)

  const isDepositingUSDCtoArbOneOrArbSepolia =
    isTokenNativeUSDC(token?.address) &&
    isDepositMode &&
    (isDestinationChainArbitrumOne || isDestinationChainArbitrumSepolia)

  if (gasSummaryStatus === 'unavailable') {
    return (
      <TransferPanelSummaryContainer>
        <div className="flex flex-row justify-between text-sm lg:text-base">
          Gas estimates are not available for this action.
        </div>
      </TransferPanelSummaryContainer>
    )
  }

  if (gasSummaryStatus === 'insufficientBalance') {
    return (
      <TransferPanelSummaryContainer>
        <div className="flex flex-row justify-between text-sm lg:text-base">
          Gas estimates will be displayed after entering a valid amount.
        </div>
      </TransferPanelSummaryContainer>
    )
  }

  return (
    <TransferPanelSummaryContainer>
      <div
        className={twMerge(
          'grid grid-cols-[260px_auto] items-center text-sm font-light'
        )}
      >
        <span className="text-left">You will pay in gas fees:</span>

        <span className="font-medium">
          <TotalGasFees />
        </span>
      </div>

      <div
        className={twMerge(
          'grid grid-cols-[260px_auto] items-center text-sm font-light'
        )}
      >
        <span>
          You will receive on {getNetworkName(networks.destinationChain.id)}:
        </span>
        <span className="font-medium">
          <span className="tabular-nums">{formatAmount(Number(amount))}</span>{' '}
          {isDepositingUSDCtoArbOneOrArbSepolia ? (
            <>USDC</>
          ) : (
            <TokenSymbolWithExplorerLink
              token={token}
              isParentChain={!isDepositMode}
            />
          )}
          {isBridgingEth && (
            <NativeCurrencyPrice amount={Number(amount)} showBrackets />
          )}
          {isBatchTransferSupported && Number(amount2) > 0 && (
            <span> + {amount2} ETH</span>
          )}
        </span>
      </div>
    </TransferPanelSummaryContainer>
  )
}
