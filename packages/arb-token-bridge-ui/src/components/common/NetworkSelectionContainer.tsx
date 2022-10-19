import { L1Network, L2Network } from '@arbitrum/sdk'
import { useWallet } from '@arbitrum/use-wallet'
import { Popover, Transition } from '@headlessui/react'
import { useAppState } from '../../state'
import { networksListArray, networkStyleMap } from '../../util/networks'
import { changeNetworkBasic } from '../../util/NetworkUtils'

export const NetworkSelectionContainer = ({
  children,
  filterNetworks
}: {
  children: JSX.Element | null
  filterNetworks?: (network: L1Network | L2Network) => boolean
}) => {
  const { provider } = useWallet()
  const { app } = useAppState()

  const changeNetwork = async (network: L1Network | L2Network) => {
    if (app.changeNetwork) {
      // if the rich app-injected version of changeNetwork is present, use that.
      await app.changeNetwork(network)
    } else {
       // else use the basic network switching logic
      await changeNetworkBasic(provider, network)
    }
  }

  return (
    <Popover className="relative z-50 w-full lg:w-max">
      <Popover.Button className="arb-hover flex w-full justify-center rounded-full lg:w-max">
        {children}
      </Popover.Button>

      <Transition>
        <Popover.Panel className="relative flex flex-col rounded-md lg:bg-white lg:absolute lg:mt-4 lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {networksListArray
            .filter(network => filterNetworks?.(network) || true)
            .map(network => (
              <div
                key={network.chainID}
                className="flex h-12 cursor-pointer flex-nowrap lg:justify-start lg:text-dark lg:font-normal justify-center font-light text-white items-center space-x-3 px-4 hover:bg-blue-arbitrum hover:bg-[rgba(0,0,0,0.2)]"
                onClick={()=>{
                  changeNetwork(network)
                }}
              >
                <img
                  src={networkStyleMap[network.chainID]['img']}
                  alt={`${network.name} logo`}
                  className="max-w-8 max-h-8"
                />
                <span className="whitespace-nowrap">{network.name}</span>
              </div>
            ))}
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
