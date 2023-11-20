import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { ChainLayer, useChainLayers } from '../../hooks/useChainLayers'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { getNetworkName, isNetwork } from '../../util/networks'
import { Tooltip } from '../common/Tooltip'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useGasSummaryStore } from '../../hooks/TransferPanel/useGasSummaryStore'
import { Loader } from '../common/atoms/Loader'

const depositGasFeeTooltip = ({
  l1NetworkName,
  l2NetworkName,
  depositToOrbit = false
}: {
  l1NetworkName: string
  l2NetworkName: string
  depositToOrbit?: boolean
}) => ({
  L1: `${l1NetworkName} fees go to Ethereum Validators.`,
  L2: `${
    depositToOrbit ? l1NetworkName : l2NetworkName
  } fees are collected by the chain to cover costs of execution. This is an estimated fee, if the true fee is lower, you'll be refunded.`,
  Orbit: `${l2NetworkName} fees are collected by the chain to cover costs of execution. This is an estimated fee, if the true fee is lower, you'll be refunded.`
})

function StyledLoader() {
  return (
    <span className="flex justify-end">
      <Loader size="small" />
    </span>
  )
}

export function EstimatedGas({ chain }: { chain: 'parent' | 'child' }) {
  const {
    app: { isDepositMode, selectedToken }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()
  const { parentLayer, layer: childLayer } = useChainLayers()
  const { ethToUSD } = useETHPrice()
  const nativeCurrency = useNativeCurrency({ provider: l2.provider })
  const parentChainNativeCurrency = useNativeCurrency({ provider: l1.provider })
  const isParentChain = chain === 'parent'
  const {
    gasSummaryStatus,
    gasSummary: { estimatedL1GasFees, estimatedL2GasFees }
  } = useGasSummaryStore()
  const l1NetworkName = getNetworkName(l1.network.id)
  const l2NetworkName = getNetworkName(l2.network.id)
  const isBridgingEth = selectedToken === null && !nativeCurrency.isCustom
  const showPrice = isBridgingEth && !isNetwork(l1.network.id).isTestnet
  const layer = isParentChain ? parentLayer : childLayer

  // only hide gas estimation for parent layer at withdrawal mode
  const showBreakdown = isDepositMode || !isParentChain

  const estimatedGasFee = useMemo(() => {
    if (!isDepositMode && !isParentChain) {
      return estimatedL1GasFees + estimatedL2GasFees
    }
    return isParentChain ? estimatedL1GasFees : estimatedL2GasFees
  }, [estimatedL1GasFees, estimatedL2GasFees, isDepositMode, isParentChain])

  const layerGasFeeTooltipContent = (layer: ChainLayer) => {
    if (!isDepositMode) {
      return null
    }

    const { isOrbitChain: isDepositToOrbitChain } = isNetwork(l2.network.id)

    return depositGasFeeTooltip({
      l1NetworkName,
      l2NetworkName,
      depositToOrbit: isDepositToOrbitChain
    })[layer]
  }

  if (!showBreakdown) {
    return null
  }

  return (
    <div
      className={twMerge(
        'grid items-center rounded-md bg-white/25 px-3 py-2 text-right text-sm font-light text-white',
        showPrice ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2fr_1fr]'
      )}
    >
      <div className="flex flex-row items-center gap-1">
        <span className="text-left">Gas fee</span>
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
        <>
          <span className="text-right tabular-nums">
            {formatAmount(estimatedGasFee, {
              symbol: isParentChain
                ? parentChainNativeCurrency.symbol
                : nativeCurrency.symbol
            })}
          </span>

          {showPrice && (
            <span className="tabular-nums">
              {formatUSD(ethToUSD(estimatedGasFee))}
            </span>
          )}
        </>
      )}
    </div>
  )
}
