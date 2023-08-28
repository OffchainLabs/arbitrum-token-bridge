import { Popover, Transition } from '@headlessui/react'
import Image from 'next/image'
import { useCallback } from 'react'
import { useNetwork } from 'wagmi'

import {
  ChainId,
  getNetworkLogo,
  getNetworkName,
  getSupportedNetworks,
  isNetwork
} from '../../util/networks'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useAccountType } from '../../hooks/useAccountType'

export const NetworkSelectionContainer = ({
  children
}: {
  children: React.ReactNode
}) => {
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetworkWithConfig()
  const supportedNetworks = getSupportedNetworks(chain?.id).filter(
    chainId => chainId !== chain?.id
  )
  const { isSmartContractWallet } = useAccountType()

  const isTestnet = chain?.id ? isNetwork(chain.id).isTestnet : false

  const l1Networks = supportedNetworks.filter(
    network => isNetwork(network).isEthereum
  )
  const l2Networks = supportedNetworks.filter(
    network => isNetwork(network).isArbitrum
  )

  const orbitNetworks = supportedNetworks.filter(
    network => isNetwork(network).isOrbitChain
  )

  const finalNetworks = [
    { id: 'l1', title: 'L1', networks: l1Networks },
    { id: 'l2', title: 'L2', networks: l2Networks },
    { id: 'orbit', title: 'Orbit', networks: orbitNetworks }
  ]

  const handleClick = useCallback(
    (
      chainId: ChainId,
      close: (
        focusableElement?:
          | HTMLElement
          | React.MutableRefObject<HTMLElement | null>
          | undefined
      ) => void
    ) => {
      switchNetwork?.(Number(chainId))
      close?.() //close the popover after option-click
    },
    [switchNetwork]
  )

  return (
    <Popover className="relative z-50 w-full lg:w-max">
      <Popover.Button
        disabled={
          isSmartContractWallet || typeof isSmartContractWallet === 'undefined'
        }
        className="arb-hover flex w-full justify-start rounded-full px-6 py-3 lg:w-max lg:p-0"
      >
        {children}
      </Popover.Button>

      <Transition>
        <Popover.Panel className="relative flex w-full flex-col justify-between rounded-md lg:absolute lg:ml-1 lg:mt-1 lg:w-max lg:flex-row lg:gap-3 lg:bg-white lg:p-2 lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {({ close }) => (
            <>
              {finalNetworks.map(networkType => {
                //if no networks present in l1/l2/l3, just don't show that column
                if (!networkType.networks.length) return null

                // else show the column with networks listed
                return (
                  <div key={networkType.id} className="shrink-0">
                    {/* Only show the L1/L2/L3 title if testnet is connected */}
                    {isTestnet && (
                      <div className="p-2 px-12 text-xl lg:px-4">
                        {networkType.title}
                      </div>
                    )}

                    {networkType.networks.map(chainId => (
                      <button
                        key={chainId}
                        className="flex h-10 cursor-pointer flex-nowrap items-center justify-start space-x-3 px-12 text-lg font-light text-white first:rounded-t-md hover:bg-[rgba(0,0,0,0.2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-4 lg:px-4 lg:text-base lg:font-normal lg:text-dark"
                        onClick={() => {
                          handleClick(chainId, close)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.keyCode === 13) {
                            handleClick(chainId, close)
                          }
                        }}
                        type="button"
                        aria-label={`Switch to ${getNetworkName(
                          Number(chainId)
                        )}`}
                      >
                        <div className="flex h-6 w-6 items-center justify-center lg:h-6 lg:w-6">
                          <Image
                            src={getNetworkLogo(Number(chainId))}
                            alt={`${getNetworkName(Number(chainId))} logo`}
                            className="h-full w-auto"
                            width={24}
                            height={24}
                          />
                        </div>
                        <span className="whitespace-nowrap">
                          {getNetworkName(Number(chainId))}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
