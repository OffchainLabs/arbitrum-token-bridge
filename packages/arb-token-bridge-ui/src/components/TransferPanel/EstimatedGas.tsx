import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { ChainLayer, useChainLayers } from '../../hooks/useChainLayers'
import { useAppState } from '../../state'
import { getNetworkName, isNetwork } from '../../util/networks'
import { Tooltip } from '../common/Tooltip'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useGasSummary } from '../../hooks/TransferPanel/useGasSummary'
import { Loader } from '../common/atoms/Loader'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

const gasFeeTooltip = ({
  parentChainName,
  childChainName,
  depositToOrbit = false
}: {
  parentChainName: string
  childChainName: string
  depositToOrbit?: boolean
}) => ({
  L1: `${parentChainName} fees go to ${parentChainName} Validators.`,
  L2: `${
    depositToOrbit ? parentChainName : childChainName
  } fees are collected by the chain to cover costs of execution. This is an estimated fee, if the true fee is lower, you'll be refunded.`,
  Orbit: `${childChainName} fees are collected by the chain to cover costs of execution. This is an estimated fee, if the true fee is lower, you'll be refunded.`
})

function StyledLoader() {
  return (
    <span className="flex justify-end">
      <Loader size="small" />
    </span>
  )
}

export function EstimatedGas({ chainType }: { chainType: 'parent' | 'child' }) {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, isDepositMode } =
    useNetworksRelationship(networks)
  const { parentLayer, layer: childLayer } = useChainLayers()
  const { ethToUSD } = useETHPrice()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const isParentChain = chainType === 'parent'
  const {
    gasSummaryStatus,
    gasSummary: { estimatedL1GasFees, estimatedL2GasFees }
  } = useGasSummary()
  const parentChainName = getNetworkName(childChain.id)
  const childChainName = getNetworkName(parentChain.id)
  const isBridgingEth = selectedToken === null && !nativeCurrency.isCustom
  const showPrice = useMemo(
    () => isBridgingEth && !isNetwork(childChain.id).isTestnet,
    [isBridgingEth, childChain.id]
  )
  const layer = isParentChain ? parentLayer : childLayer

  const isWithdrawalParentChain = !isDepositMode && isParentChain

  const estimatedGasFee = useMemo(() => {
    if (!isDepositMode && !isParentChain) {
      return estimatedL1GasFees + estimatedL2GasFees
    }
    return isParentChain ? estimatedL1GasFees : estimatedL2GasFees
  }, [estimatedL1GasFees, estimatedL2GasFees, isDepositMode, isParentChain])

  const layerGasFeeTooltipContent = (layer: ChainLayer) => {
    const { isOrbitChain: isDepositToOrbitChain } = isNetwork(childChain.id)

    return gasFeeTooltip({
      parentChainName,
      childChainName,
      depositToOrbit: isDepositToOrbitChain
    })[layer]
  }

  if (isWithdrawalParentChain) {
    return (
      <div
        className={twMerge(
          'grid items-center',
          'rounded-md bg-white/25 px-3 py-2',
          'text-xs font-light text-white'
        )}
      >
        You&apos;ll have to pay {parentChainName} gas fee upon claiming.
      </div>
    )
  }

  return (
    <div
      className={twMerge(
        'flex items-center justify-between',
        'rounded-md bg-white/25 px-3 py-2',
        'text-right text-xs font-light text-white'
      )}
    >
      <div className="flex w-1/2 flex-row items-center gap-1">
        <span className="text-left">
          {isParentChain ? parentChainName : childChainName} gas
        </span>
        <Tooltip content={layerGasFeeTooltipContent(layer)}>
          <InformationCircleIcon className="h-4 w-4" />
        </Tooltip>
      </div>
      {gasSummaryStatus === 'loading' ? (
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
          <span className="text-right tabular-nums">
            {formatAmount(estimatedGasFee, {
              symbol: nativeCurrency.symbol
            })}
          </span>

          {showPrice && (
            <span className="tabular-nums">
              {formatUSD(ethToUSD(estimatedGasFee))}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
