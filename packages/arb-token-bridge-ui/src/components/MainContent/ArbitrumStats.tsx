import { utils } from 'ethers'
import useLocalStorage from '@rehooks/local-storage'
import { useBlockNumber } from 'wagmi'

import { getNetworkName, isNetwork } from '../../util/networks'
import { useNetworkTPS } from '../../hooks/useNetworkTPS'
import { useGasPrice } from '../../hooks/useGasPrice'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useChainLayers } from '../../hooks/useChainLayers'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

export const statsLocalStorageKey = 'arbitrum:bridge:preferences:stats'

const getActivityThresholdL1 = (gasPrice: number) => {
  if (gasPrice < 20) return { className: 'text-[#008000]' }
  if (gasPrice < 40) return { className: 'text-orange-arbitrum-nova' }
  return { className: 'text-[#ff0000]' }
}

const getActivityThresholdL2 = (gasPrice: number) => {
  if (gasPrice < 0.5) return { className: 'text-[#008000]' }
  if (gasPrice < 2) return { className: 'text-orange-arbitrum-nova' }
  return { className: 'text-[#ff0000]' }
}

export const ArbitrumStats = () => {
  const [, setIsArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)
  const [{ settingsOpen }] = useArbQueryParams()

  const [networks] = useNetworks()
  const { childChain, childProvider, parentChain, parentProvider } =
    useNetworksRelationship(networks)
  const { parentLayer, layer } = useChainLayers()

  const { data: currentL1BlockNumber } = useBlockNumber({
    chainId: parentChain.id,
    watch: true
  })

  const { data: currentL2BlockNumber } = useBlockNumber({
    chainId: childChain.id,
    watch: true
  })

  const { data: tpsData, isValidating: tpsLoading } = useNetworkTPS()

  const currentL1GasPrice = useGasPrice({ provider: parentProvider })
  const currentL1GasPriceGwei = utils.formatUnits(currentL1GasPrice, 'gwei')
  const currentL1Activity = getActivityThresholdL1(
    Number(currentL1GasPriceGwei || 0)
  )

  const currentL2GasPrice = useGasPrice({ provider: childProvider })
  const currentL2GasPriceGwei = utils.formatUnits(currentL2GasPrice, 'gwei')
  const currentL2Activity = getActivityThresholdL2(
    Number(currentL2GasPriceGwei || 0)
  )

  const closeArbitrumStats = () => {
    setIsArbitrumStatsVisible(false)
  }

  return (
    <div className="fixed bottom-0 right-0 z-[100] m-4 flex flex-col gap-2 whitespace-nowrap rounded-md bg-[#000000d1] p-4 font-[monospace] text-xs text-gray-6">
      <div className="section flex flex-col">
        <span className="text-md text-white">
          <span className="mr-1 animate-pulse text-lg text-[#008000]">
            &bull;
          </span>{' '}
          {getNetworkName(parentChain.id)} ({parentLayer})
        </span>
        <span>
          &gt; Block:{' '}
          {currentL1BlockNumber ? currentL1BlockNumber : 'Loading...'}
        </span>
        <span>
          &gt; Gas price:{' '}
          <span className={`${currentL1Activity.className}`}>
            {' '}
            {Number(currentL1GasPriceGwei).toFixed(2)} Gwei{' '}
          </span>
        </span>
      </div>

      <div className="section flex flex-col">
        <span className="text-md text-white">
          <span className="mr-1 animate-pulse text-lg text-[#008000]">
            &bull;
          </span>{' '}
          {getNetworkName(childChain.id)} ({layer})
        </span>
        <span>
          &gt; Block:{' '}
          {currentL2BlockNumber ? currentL2BlockNumber : 'Loading...'}
        </span>
        <span>
          &gt; Gas price:{' '}
          <span className={`${currentL2Activity.className}`}>
            {' '}
            {Number(currentL2GasPriceGwei).toFixed(2)} Gwei{' '}
          </span>
        </span>

        {/* TPS info is not available for testnets */}
        {!isNetwork(childChain.id).isTestnet && (
          <span>
            &gt; TPS: {tpsLoading && <span>Loading...</span>}
            {!tpsLoading && (
              <span>{tpsData?.tps ? `${tpsData.tps} TPS` : '-'}</span>
            )}
          </span>
        )}
      </div>

      {/* Don't show the close button if the settings panel is visible */}
      {!settingsOpen && (
        <button
          className="absolute right-4 top-4 cursor-pointer"
          onClick={closeArbitrumStats}
        >
          [x]
        </button>
      )}
    </div>
  )
}
