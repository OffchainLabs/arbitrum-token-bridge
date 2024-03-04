import { utils } from 'ethers'
import { useBlockNumber } from 'wagmi'
import Image from 'next/image'
import { useLocalStorage } from '@uidotdev/usehooks'

import { getNetworkName, isNetwork } from '../../util/networks'
import { useNetworkTPS } from '../../hooks/useNetworkTPS'
import { useGasPrice } from '../../hooks/useGasPrice'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'

export const statsLocalStorageKey = 'arbitrum:bridge:preferences:stats'

const getActivityThresholdL1 = (gasPrice: number) => {
  if (gasPrice < 20) return { className: 'text-green-300' }
  if (gasPrice < 40) return { className: 'text-orange-arbitrum-nova' }
  return { className: 'text-red-400' }
}

const getActivityThresholdL2 = (gasPrice: number) => {
  if (gasPrice < 0.5) return { className: 'text-green-300' }
  if (gasPrice < 2) return { className: 'text-orange-arbitrum-nova' }
  return { className: 'text-red-400' }
}

export const ArbitrumStats = () => {
  const [, setIsArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)

  const [{ settingsOpen }] = useArbQueryParams()

  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks)

  const { data: currentL1BlockNumber } = useBlockNumber({
    chainId: parentChain.id,
    watch: true
  })

  const { data: currentL2BlockNumber } = useBlockNumber({
    chainId: childChain.id,
    watch: true
  })

  const { data: tpsData, isValidating: tpsLoading } = useNetworkTPS()

  const currentL1GasPrice = useGasPrice({ provider: parentChainProvider })
  const currentL1GasPriceGwei = utils.formatUnits(currentL1GasPrice, 'gwei')
  const currentL1Activity = getActivityThresholdL1(
    Number(currentL1GasPriceGwei || 0)
  )

  const currentL2GasPrice = useGasPrice({ provider: childChainProvider })
  const currentL2GasPriceGwei = utils.formatUnits(currentL2GasPrice, 'gwei')
  const currentL2Activity = getActivityThresholdL2(
    Number(currentL2GasPriceGwei || 0)
  )

  const closeArbitrumStats = () => {
    setIsArbitrumStatsVisible(false)
  }

  return (
    <div className="fixed bottom-0 right-0 m-4 flex flex-col gap-2 whitespace-nowrap rounded border border-gray-dark bg-dark py-2 pl-3 pr-7 font-[monospace] text-xs text-gray-3 opacity-90">
      <div className="section flex flex-col">
        <span className="text-md flex items-center text-white">
          <span className="mr-1 animate-pulse text-lg text-green-300">
            &bull;
          </span>{' '}
          <Image
            height={10}
            width={10}
            src={getBridgeUiConfigForChain(parentChain.id).network.logo}
            alt="Parent chain logo"
            className="mr-1"
          />
          {getNetworkName(parentChain.id)}
        </span>
        <span>
          Block: {currentL1BlockNumber ? currentL1BlockNumber : 'Loading...'}
        </span>
        <span>
          Gas price:{' '}
          <span className={`${currentL1Activity.className}`}>
            {' '}
            {Number(currentL1GasPriceGwei).toFixed(2)} Gwei{' '}
          </span>
        </span>
      </div>

      <div className="section flex flex-col">
        <span className="text-md flex items-center text-white">
          <span className="mr-1 animate-pulse text-lg text-green-300">
            &bull;
          </span>{' '}
          <Image
            height={10}
            width={10}
            src={getBridgeUiConfigForChain(childChain.id).network.logo}
            alt="Parent chain logo"
            className="mr-1"
          />
          {getNetworkName(childChain.id)}
        </span>
        <span>
          Block: {currentL2BlockNumber ? currentL2BlockNumber : 'Loading...'}
        </span>
        <span>
          Gas price:{' '}
          <span className={`${currentL2Activity.className}`}>
            {' '}
            {Number(currentL2GasPriceGwei).toFixed(2)} Gwei{' '}
          </span>
        </span>

        {/* TPS info is not available for testnets */}
        {!isNetwork(childChain.id).isTestnet && (
          <span>
            TPS: {tpsLoading && <span>Loading...</span>}
            {!tpsLoading && (
              <span>{tpsData?.tps ? `${tpsData.tps} TPS` : '-'}</span>
            )}
          </span>
        )}
      </div>

      {/* Don't show the close button if the settings panel is visible */}
      {!settingsOpen && (
        <button
          className="arb-hover absolute right-3 top-3 cursor-pointer"
          onClick={closeArbitrumStats}
        >
          <XMarkIcon height={16} />
        </button>
      )}
    </div>
  )
}
