import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { getNetworkName, isNetwork } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { Tooltip } from '../common/Tooltip'
import { formatAmount } from '../../util/NumberUtils'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useGasSummary } from '../../hooks/TransferPanel/useGasSummary'
import { Loader } from '../common/atoms/Loader'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { NativeCurrencyPrice, useIsBridgingEth } from './NativeCurrencyPrice'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { useSelectedToken } from '../../hooks/useSelectedToken'

function getGasFeeTooltip(chainId: ChainId) {
  const { isEthereumMainnetOrTestnet } = isNetwork(chainId)
  const networkName = getNetworkName(chainId)

  if (isEthereumMainnetOrTestnet) {
    return `${networkName} fees go to ${networkName} Validators.`
  }

  // Arbitrum and Orbit chains
  return `${networkName} fees are collected by the chain to cover costs of execution. This is an estimated fee. If the true fee is lower, you'll be refunded.`
}

function StyledLoader() {
  return (
    <span className="flex justify-end">
      <Loader size="small" />
    </span>
  )
}

function GasFeeForClaimTxMessage({ networkName }: { networkName: string }) {
  return (
    <div
      className={twMerge(
        'grid items-center',
        'rounded bg-white/30 p-2 opacity-80',
        'text-xs font-light text-white'
      )}
    >
      You&apos;ll have to pay {networkName} gas fee upon claiming.
    </div>
  )
}

export function EstimatedGas({
  chainType
}: {
  chainType: 'source' | 'destination'
}) {
  const [selectedToken] = useSelectedToken()
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
  const isSourceChain = chainType === 'source'
  const isParentChain = isSourceChain
    ? networks.sourceChain.id === parentChain.id
    : networks.destinationChain.id === parentChain.id
  const {
    status: gasSummaryStatus,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  } = useGasSummary()
  const parentChainName = getNetworkName(parentChain.id)
  const isBridgingEth = useIsBridgingEth(childChainNativeCurrency)
  const showPrice = useMemo(
    () => isBridgingEth && !isNetwork(childChain.id).isTestnet,
    [isBridgingEth, childChain.id]
  )

  const isDestinationArbOne = isNetwork(
    networks.destinationChain.id
  ).isArbitrumOne
  const isDestinationArbSepolia = isNetwork(
    networks.destinationChain.id
  ).isArbitrumSepolia

  const isWithdrawalParentChain = !isDepositMode && isParentChain

  const estimatedGasFee = useMemo(() => {
    if (
      !isDepositMode &&
      !isParentChain &&
      typeof estimatedParentChainGasFees !== 'undefined' &&
      typeof estimatedChildChainGasFees !== 'undefined'
    ) {
      return estimatedParentChainGasFees + estimatedChildChainGasFees
    }
    return isParentChain
      ? estimatedParentChainGasFees
      : estimatedChildChainGasFees
  }, [
    estimatedParentChainGasFees,
    estimatedChildChainGasFees,
    isDepositMode,
    isParentChain
  ])

  const layerGasFeeTooltipContent = useMemo(
    () =>
      getGasFeeTooltip(
        isSourceChain ? networks.sourceChain.id : networks.destinationChain.id
      ),
    [isSourceChain, networks.sourceChain.id, networks.destinationChain.id]
  )

  if (isWithdrawalParentChain) {
    return <GasFeeForClaimTxMessage networkName={parentChainName} />
  }

  if (
    isTokenNativeUSDC(selectedToken?.address) &&
    !isSourceChain &&
    (isDestinationArbSepolia || isDestinationArbOne)
  ) {
    return (
      <GasFeeForClaimTxMessage networkName={networks.destinationChain.name} />
    )
  }

  return (
    <div
      className={twMerge(
        'flex items-center justify-between',
        'rounded-md bg-white/30 p-2',
        'text-right text-xs font-light text-white opacity-80'
      )}
    >
      <div className="flex w-1/2 flex-row items-center gap-1">
        <span className="text-left">
          {isSourceChain
            ? networks.sourceChain.name
            : networks.destinationChain.name}{' '}
          gas fee
        </span>
        <Tooltip content={layerGasFeeTooltipContent}>
          <InformationCircleIcon className="h-3 w-3" />
        </Tooltip>
      </div>
      {gasSummaryStatus === 'loading' ||
      typeof estimatedGasFee === 'undefined' ? (
        <>
          {showPrice && <span />}
          <StyledLoader />
        </>
      ) : (
        <div
          className={twMerge(
            'flex w-1/2',
            showPrice ? ' justify-between' : 'justify-end'
          )}
        >
          <span className="text-right">
            {formatAmount(estimatedGasFee, {
              symbol: isParentChain
                ? parentChainNativeCurrency.symbol
                : childChainNativeCurrency.symbol
            })}
          </span>

          {showPrice && <NativeCurrencyPrice amount={estimatedGasFee} />}
        </div>
      )}
    </div>
  )
}
