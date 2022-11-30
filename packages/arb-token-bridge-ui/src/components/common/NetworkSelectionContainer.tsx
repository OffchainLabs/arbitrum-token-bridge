import { useWallet } from '@arbitrum/use-wallet'
import { Web3Provider } from '@ethersproject/providers'
import { Popover, Transition } from '@headlessui/react'
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
      <Popover.Button className="arb-hover flex w-full justify-center rounded-full lg:w-max">
        {children}
      </Popover.Button>

      <Transition>
        <Popover.Panel className="relative flex flex-col rounded-md lg:absolute lg:mt-4 lg:bg-white lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {({ close }) =>
            supportedNetworks?.map((chainId, i) => (
              <div
                key={chainId}
                className="flex h-12 cursor-pointer flex-nowrap items-center justify-center space-x-3 px-4 font-light text-white hover:bg-blue-arbitrum hover:bg-[rgba(0,0,0,0.2)] lg:justify-start lg:font-normal lg:text-dark"
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
                <div className="flex h-8 w-8 items-center justify-center">
                  <img
                    src={getNetworkLogo(Number(chainId))}
                    alt={`${getNetworkName(Number(chainId))} logo`}
                    className="max-w-8 max-h-8"
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
