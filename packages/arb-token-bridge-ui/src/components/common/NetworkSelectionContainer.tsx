import { useWallet } from '@arbitrum/use-wallet'
import { Web3Provider } from '@ethersproject/providers'
import { Popover, Transition } from '@headlessui/react'
import Image from 'next/image'
import {
  ChainId,
  getNetworkLogo,
  getNetworkName,
  switchChain
} from '../../util/networks'

export const NetworkSelectionContainer = ({
  supportedNetworks,
  children
}: {
  supportedNetworks: ChainId[]
  children: React.ReactNode
}) => {
  const { provider } = useWallet()

  const handleClick = (
    chainId: ChainId,
    close: (
      focusableElement?:
        | HTMLElement
        | React.MutableRefObject<HTMLElement | null>
        | undefined
    ) => void
  ) => {
    switchChain({
      chainId: Number(chainId),
      provider: provider as Web3Provider
    })
    close?.() //close the popover after option-click
  }

  return (
    <Popover className="relative z-50 w-full lg:w-max">
      <Popover.Button className="arb-hover flex w-full justify-start rounded-full p-4 lg:w-max lg:p-0">
        {children}
      </Popover.Button>

      <Transition>
        <Popover.Panel className="relative flex flex-col rounded-md lg:absolute lg:ml-1 lg:mt-1 lg:bg-white lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {({ close }) =>
            supportedNetworks?.map((chainId, i) => (
              <div // TODO: replace with button
                key={chainId}
                className="flex h-12 cursor-pointer flex-nowrap items-center justify-start space-x-3 px-[4rem] text-lg font-light text-white hover:bg-[rgba(0,0,0,0.2)] hover:bg-blue-arbitrum lg:px-4 lg:text-base lg:font-normal lg:text-dark"
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
