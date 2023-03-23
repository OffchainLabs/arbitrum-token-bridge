import { utils } from 'ethers'
import { useGasPrice } from 'token-bridge-sdk'
import { useBlockNumber } from '../../hooks/useBlockNumber'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getNetworkName } from '../../util/networks'
import { formatUSD } from '../../util/NumberUtils'
import { useAppContextDispatch, useAppContextState } from '../App/AppContext'

const getActivityThresholdL1 = (gasPrice: number) => {
  if (!gasPrice) gasPrice = 0
  if (gasPrice < 15) return { activity: 'Low', className: 'text-[#008000]' }
  if (gasPrice < 20)
    return { activity: 'Average', className: 'text-orange-arbitrum-nova' }
  return { activity: 'High', className: 'text-[#ff0000]' }
}

const getActivityThresholdL2 = (gasPrice: number) => {
  if (!gasPrice) gasPrice = 0
  if (gasPrice < 0.5) return { activity: 'Low', className: 'text-[#008000]' }
  if (gasPrice < 2)
    return { activity: 'Average', className: 'text-orange-arbitrum-nova' }
  return { activity: 'High', className: 'text-[#ff0000]' }
}

export const ArbitrumStats = () => {
  const dispatch = useAppContextDispatch()

  const { l1, l2 } = useNetworksAndSigners()

  const currentL1BlockNumber = useBlockNumber(l1.provider)
  const currentL2BlockNumber = useBlockNumber(l2.provider)

  const { ethToUSD } = useETHPrice()

  const currentL1GasPrice = useGasPrice({ provider: l1.provider })
  const currentL1GasPriceEth = utils.formatEther(currentL1GasPrice)
  const currentL1GasPriceGwei = utils.formatUnits(currentL1GasPrice, 'gwei')
  const currentL1GasPriceUSD = formatUSD(ethToUSD(Number(currentL1GasPriceEth)))
  const currentL1Activity = getActivityThresholdL1(
    Number(currentL1GasPriceGwei || 0)
  )

  const currentL2GasPrice = useGasPrice({ provider: l2.provider })
  const currentL2GasPriceEth = utils.formatEther(currentL2GasPrice)
  const currentL2GasPriceWei = utils.formatUnits(currentL2GasPrice)
  const currentL2GasPriceGwei = utils.formatUnits(currentL2GasPrice, 'gwei')
  const currentL2GasPriceUSD = formatUSD(ethToUSD(Number(currentL2GasPriceEth)))
  const currentL2Activity = getActivityThresholdL2(
    Number(currentL2GasPriceGwei || 0)
  )

  function closeArbitrumStats() {
    dispatch({ type: 'layout.set_arbitrumstats_panel_visible', payload: false })
  }

  return (
    <div className="fixed right-0 bottom-0 z-50 m-4 flex flex-col gap-2 whitespace-nowrap rounded-md bg-[#000000e6] p-4 text-xs text-gray-8">
      <div className="section flex flex-col">
        <span className="text-md text-white">
          <span className="mr-1 animate-pulse text-lg text-[#008000]">
            &bull;
          </span>{' '}
          Ethereum (L1)
        </span>
        <span>
          &gt; Block :{' '}
          {currentL1BlockNumber ? currentL1BlockNumber : 'Loading...'}
        </span>
        <span>&gt; Gas price : {currentL1GasPriceGwei} Gwei</span>
        <span>
          &gt; Activity :{' '}
          <span className={`${currentL1Activity.className}`}>
            {currentL1Activity.activity}
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
          &gt; Block :{' '}
          {currentL2BlockNumber ? currentL2BlockNumber : 'Loading...'}
        </span>
        <span>&gt; Gas price : {currentL2GasPriceGwei} Gwei</span>
        <span>
          &gt; Activity :{' '}
          <span className={`${currentL2Activity.className}`}>
            {currentL2Activity.activity}
          </span>
        </span>
      </div>

      <div
        className="absolute right-4 top-4 cursor-pointer"
        onClick={closeArbitrumStats}
      >
        [x]
      </div>
    </div>
  )
}
