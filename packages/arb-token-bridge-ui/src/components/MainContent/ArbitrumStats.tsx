import { utils } from 'ethers'
import { useArbQueryParams } from 'src/hooks/useArbQueryParams'
import { useGasPrice } from 'token-bridge-sdk'
import { useArbStats } from '../../hooks/useArbStats'
import { useBlockNumber } from '../../hooks/useBlockNumber'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getNetworkName, isNetwork } from '../../util/networks'

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
  const [, setQueryParams] = useArbQueryParams()

  const { l1, l2 } = useNetworksAndSigners()

  const currentL1BlockNumber = useBlockNumber(l1.provider)
  const currentL2BlockNumber = useBlockNumber(l2.provider)

  const { data: arbStats, isValidating: arbStatsLoading } = useArbStats()

  const currentL1GasPrice = useGasPrice({ provider: l1.provider })
  const currentL1GasPriceGwei = utils.formatUnits(currentL1GasPrice, 'gwei')
  const currentL1Activity = getActivityThresholdL1(
    Number(currentL1GasPriceGwei || 0)
  )

  const currentL2GasPrice = useGasPrice({ provider: l2.provider })
  const currentL2GasPriceGwei = utils.formatUnits(currentL2GasPrice, 'gwei')
  const currentL2Activity = getActivityThresholdL2(
    Number(currentL2GasPriceGwei || 0)
  )

  const closeArbitrumStats = () => {
    setQueryParams({ stats: false })
  }

  return (
    <div className="fixed bottom-0 right-0 z-[100] m-4 flex flex-col gap-2 whitespace-nowrap rounded-md bg-[#000000d1] p-4 font-[monospace] text-xs text-gray-8">
      <div className="section flex flex-col">
        <span className="text-md text-white">
          <span className="mr-1 animate-pulse text-lg text-[#008000]">
            &bull;
          </span>{' '}
          {getNetworkName(l1.network.chainID)} (L1)
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
          {getNetworkName(l2.network.chainID)} (L2)
        </span>
        <span>
          &gt; Block:{' '}
          {currentL2BlockNumber ? currentL2BlockNumber : 'Loading...'}
        </span>
        <span>
          &gt; Gas price:{' '}
          <span className={`${currentL2Activity.className}`}>
            {' '}
            {Number(currentL2GasPriceGwei).toFixed(2)}
          </span>
        </span>

        {/* TPS info is not available for testnets */}
        {!isNetwork(l2.network.chainID).isTestnet && (
          <span>
            &gt; TPS: {arbStatsLoading ? 'Loading...' : arbStats?.tps || '-'}
          </span>
        )}
      </div>

      <button
        className="absolute right-4 top-4 cursor-pointer"
        onClick={closeArbitrumStats}
      >
        [x]
      </button>
    </div>
  )
}
