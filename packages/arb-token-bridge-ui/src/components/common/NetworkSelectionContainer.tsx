import { getL2Network, getL1Network } from '@arbitrum/sdk'
import { useWallet } from '@arbitrum/use-wallet'
import { Popover, Transition } from '@headlessui/react'
import { useAppState } from '../../state'
import { ChainId, getNetworkName } from '../../util/networks'
import {
  changeNetworkBasic,
  networkStyleMap,
  networkSelectionList
} from '../../util/NetworkUtils'

export const NetworkSelectionContainer = ({
  children,
  filterNetworks
}: {
  children: JSX.Element | null
  filterNetworks?: (networkId: ChainId) => boolean
}) => {
  const { provider } = useWallet()
  const { app } = useAppState()

  const changeNetwork = async (chainId: ChainId) => {
    let network
    try {
      network = await getL2Network(chainId)
    } catch {
      network = await getL1Network(chainId)
    }

    if (network) {
      if (app.changeNetwork) {
        // if the rich app-injected version of changeNetwork is present, use that.
        await app.changeNetwork(network)
      } else {
        // else use the basic network switching logic
        await changeNetworkBasic(provider, network)
      }
    }
  }

  return (
    <Popover className="relative z-50 w-full lg:w-max">
      <Popover.Button className="arb-hover flex w-full justify-center rounded-full lg:w-max">
        {children}
      </Popover.Button>

      <Transition>
        <Popover.Panel className="relative flex flex-col rounded-md lg:absolute lg:mt-4 lg:bg-white lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {networkSelectionList
            .filter(chainId => filterNetworks?.(chainId) || true)
            .map(chainId => (
              <div
                key={chainId}
                className="flex h-12 cursor-pointer flex-nowrap items-center justify-center space-x-3 px-4 font-light text-white hover:bg-blue-arbitrum hover:bg-[rgba(0,0,0,0.2)] lg:justify-start lg:font-normal lg:text-dark"
                onClick={() => {
                  changeNetwork(chainId)
                }}
              >
                <img
                  src={networkStyleMap[chainId]['img']}
                  alt={`${getNetworkName(chainId)} logo`}
                  className="max-w-8 max-h-8"
                />
                <span className="whitespace-nowrap">
                  {getNetworkName(chainId)}
                </span>
              </div>
            ))}
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
