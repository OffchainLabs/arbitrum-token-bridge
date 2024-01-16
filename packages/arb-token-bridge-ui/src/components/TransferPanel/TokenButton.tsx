import { useMemo } from 'react'
import { Popover } from '@headlessui/react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import { useAppState } from '../../state'
import { sanitizeImageSrc } from '../../util'
import { TokenSearch } from '../TransferPanel/TokenSearch'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { twMerge } from 'tailwind-merge'
import {
  onPopoverClose,
  PanelWrapperClassnames
} from '../common/SearchPanel/SearchPanelUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

export function TokenButton(): JSX.Element {
  const {
    app: {
      selectedToken,
      arbTokenBridge: { bridgeTokens },
      arbTokenBridgeLoaded
    }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, isDepositMode } =
    useNetworksRelationship(networks)

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const tokenLogo = useMemo<string | undefined>(() => {
    const selectedAddress = selectedToken?.address
    if (!selectedAddress) {
      return nativeCurrency.logoUrl
    }
    if (!arbTokenBridgeLoaded) {
      return undefined
    }
    if (typeof bridgeTokens === 'undefined') {
      return undefined
    }
    const logo = bridgeTokens[selectedAddress]?.logoURI
    if (logo) {
      return sanitizeImageSrc(logo)
    }
    return undefined
  }, [
    nativeCurrency,
    bridgeTokens,
    selectedToken?.address,
    arbTokenBridgeLoaded
  ])
  const chainId = isDepositMode ? parentChain.id : childChain.id

  const tokenSymbol = useMemo(() => {
    if (!selectedToken) {
      return nativeCurrency.symbol
    }

    return sanitizeTokenSymbol(selectedToken.symbol, {
      erc20L1Address: selectedToken.address,
      chainId
    })
  }, [selectedToken, chainId, nativeCurrency.symbol])

  return (
    <>
      <Popover className="h-full">
        <Popover.Button
          className="arb-hover h-full w-max rounded-bl-xl rounded-tl-xl bg-white px-3 hover:bg-gray-2"
          aria-label="Select Token"
        >
          <div className="flex items-center space-x-2">
            {tokenLogo && (
              // SafeImage is used for token logo, we don't know at buildtime where those images will be loaded from
              // It would throw error if it's loaded from external domains
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tokenLogo}
                alt="Token logo"
                className="h-5 w-5 sm:h-8 sm:w-8"
              />
            )}
            <span className="text-xl font-light sm:text-3xl">
              {tokenSymbol}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-gray-6" />
          </div>
        </Popover.Button>
        <Popover.Panel
          className={twMerge(
            PanelWrapperClassnames,
            'lg:ml-12 lg:min-w-[466px]'
          )}
        >
          {({ close }) => {
            function onClose() {
              onPopoverClose()
              close()
            }
            return (
              <>
                <div className="flex items-center justify-between border-b border-b-black px-5 py-4 lg:hidden">
                  <button onClick={onClose}>
                    <ChevronLeftIcon className="h-8 w-8" />
                  </button>
                  <button onClick={onClose}>
                    <XMarkIcon className="h-8 w-8" />
                  </button>
                </div>
                <div className="px-5 py-4">
                  <TokenSearch close={onClose} />
                </div>
              </>
            )
          }}
        </Popover.Panel>
      </Popover>
    </>
  )
}
