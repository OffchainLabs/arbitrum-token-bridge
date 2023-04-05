import { Popover, Transition } from '@headlessui/react'
import Image from 'next/image'
import { useCallback } from 'react'
import { useNetwork, useSwitchNetwork } from 'wagmi'

import {
  ChainId,
  getNetworkLogo,
  getNetworkName,
  handleSwitchNetworkError,
  isNetwork
} from '../../util/networks'

export const NetworkSelectionContainer = ({
  children
}: {
  children: React.ReactNode
}) => {
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetwork({
    onError: handleSwitchNetworkError
  })
  const supportedNetworks = isNetwork(chain?.id ?? 0).isTestnet
    ? [ChainId.Goerli, ChainId.ArbitrumGoerli]
    : [ChainId.Mainnet, ChainId.ArbitrumOne, ChainId.ArbitrumNova]

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
      <Popover.Button className="arb-hover flex w-full justify-start rounded-full py-3 px-6 lg:w-max lg:p-0">
        {children}
      </Popover.Button>

      <Transition>
        <Popover.Panel className="relative flex flex-col rounded-md lg:absolute lg:mt-1 lg:ml-1 lg:bg-white lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {({ close }) =>
            supportedNetworks?.map((chainId, i) => (
              <div // TODO: replace with button
                key={chainId}
                className="flex h-12 cursor-pointer flex-nowrap items-center justify-start space-x-3 px-12 text-lg font-light text-white hover:bg-blue-arbitrum hover:bg-[rgba(0,0,0,0.2)] lg:px-4 lg:text-base lg:font-normal lg:text-dark"
                onClick={() => {
                  handleClick(chainId, close)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.keyCode === 13) {
                    handleClick(chainId, close)
                  }
                }}
                role="button"
                tabIndex={i}
                aria-label={`Switch to ${getNetworkName(Number(chainId))}`}
              >
                <div className="flex h-6 w-6 items-center justify-center lg:h-8 lg:w-8">
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
              </div>
            ))
          }
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
