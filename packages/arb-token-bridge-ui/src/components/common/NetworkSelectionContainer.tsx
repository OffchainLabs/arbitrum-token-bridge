import { L1Network, L2Network } from '@arbitrum/sdk'
import { Popover, Transition } from '@headlessui/react'
import * as Sentry from '@sentry/react'
import { useAppState } from '../../state'
import { networksListArray, networkStyleMap } from '../../util/networks'

export const NetworkSelectionContainer = ({
  children,
  filterNetworks
}: {
  children: JSX.Element | null
  filterNetworks?: (network: L1Network | L2Network) => boolean
}) => {
  const {
    app: { changeNetwork }
  } = useAppState()

  const switchNetwork = async (network: L1Network | L2Network) => {
    try {
      await changeNetwork?.(network)
    } catch (error: any) {
      // 4001 - User rejected the request
      if (error.code !== 4001) {
        Sentry.captureException(error)
      }
    }
  }

  return (
    <Popover className="relative z-50 w-full lg:w-max">
      <Popover.Button className="arb-hover flex w-full justify-center rounded-full lg:w-max">
        {children}
      </Popover.Button>

      <Transition>
        <Popover.Panel className="relative flex flex-col rounded-md bg-white lg:absolute lg:mt-4 lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {networksListArray
            .filter(network => filterNetworks?.(network) || true)
            .map(network => (
              <div
                key={network.chainID}
                className="flex h-12 cursor-pointer flex-nowrap items-center space-x-3 px-4 hover:bg-blue-arbitrum hover:bg-[rgba(0,0,0,0.2)]"
                onClick={() => {
                  switchNetwork(network)
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
