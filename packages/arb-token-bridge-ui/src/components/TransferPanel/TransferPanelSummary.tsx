import React, { useMemo } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'

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
import { Tooltip } from '../common/Tooltip'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { NoteBox } from '../common/NoteBox'
import { DISABLED_CHAIN_IDS } from './useTransferReadiness'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useIsBatchTransferSupported } from '../../hooks/TransferPanel/useIsBatchTransferSupported'
import { getConfirmationTime } from '../../util/WithdrawalUtils'
import LightningIcon from '@/images/LightningIcon.svg'
import { BoLDUpgradeWarning } from './BoLDUpgradeWarning'
import { BoldUpgradeStatus, getBoldUpgradeInfo } from '../../util/BoLDUtils'
import { useIsOftV2Transfer } from './hooks/useIsOftV2Transfer'
import { OftTransferDisclaimer } from './OftTransferDisclaimer'

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

  const isOft = useIsOftV2Transfer()

  const [{ amount, amount2 }] = useArbQueryParams()
  const isBatchTransferSupported = useIsBatchTransferSupported()

  const {
    isArbitrumOne: isDestinationChainArbitrumOne,
    isArbitrumSepolia: isDestinationChainArbitrumSepolia
  } = isNetwork(networks.destinationChain.id)

  const boldUpgradeInfo = getBoldUpgradeInfo(networks.sourceChain.id)
  const isAffectedByBoLDUpgrade =
    boldUpgradeInfo.status === BoldUpgradeStatus.Scheduled ||
    boldUpgradeInfo.status === BoldUpgradeStatus.InProgress

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
            <span>
              {' '}
              and {formatAmount(Number(amount2))}{' '}
              {childChainNativeCurrency.symbol}
            </span>
          )}
        </span>
      </div>
      {!isDepositMode &&
        !isOft &&
        (isAffectedByBoLDUpgrade ? (
          <BoLDUpgradeWarning />
        ) : (
          <div
            className={twMerge(
              'grid grid-cols-[260px_auto] items-center text-sm font-light'
            )}
          >
            <ConfirmationTimeInfo chainId={networks.sourceChain.id} />
          </div>
        ))}

      {isOft && <OftTransferDisclaimer />}
    </TransferPanelSummaryContainer>
  )
}

function ConfirmationTimeInfo({ chainId }: { chainId: number }) {
  const {
    confirmationTimeInReadableFormat,
    confirmationTimeInReadableFormatShort,
    fastWithdrawalActive
  } = getConfirmationTime(chainId)
  return (
    <>
      <span className="whitespace-nowrap">Confirmation time:</span>
      <span className="flex flex-col items-start font-medium sm:flex-row sm:items-center">
        <span className="hidden sm:inline">
          {confirmationTimeInReadableFormat}
        </span>
        <span className="sm:hidden">
          {confirmationTimeInReadableFormatShort}
        </span>
        {fastWithdrawalActive && (
          <div className="flex items-center">
            <Tooltip
              content={
                'Fast Withdrawals relies on a committee of validators. In the event of a committee outage, your withdrawal falls back to the 7 day challenge period secured by Arbitrum Fraud Proofs.'
              }
            >
              <InformationCircleIcon className="h-3 w-3 sm:ml-1" />
            </Tooltip>
            <div className="ml-1 flex space-x-0.5 text-[#FFD000]">
              <Image src={LightningIcon} alt="Lightning Icon" />
              <span className="font-normal">FAST</span>
            </div>
          </div>
        )}
      </span>
    </>
  )
}
