import { useMemo } from 'react'
import { Popover } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

import { useAppState } from '../../state'
import { sanitizeImageSrc } from '../../util'
import { TokenSearch } from '../TransferPanel/TokenSearch'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import {
  onPopoverClose,
  panelWrapperClassnames
} from '../common/SearchPanel/SearchPanelUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { Transition } from '../common/Transition'

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
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              className="arb-hover h-full w-max rounded-bl rounded-tl px-3 py-3 text-white"
              aria-label="Select Token"
            >
              <div className="flex items-center gap-2">
                {tokenLogo && (
                  // SafeImage is used for token logo, we don't know at buildtime where those images will be loaded from
                  // It would throw error if it's loaded from external domains
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tokenLogo}
                    alt="Token logo"
                    className="h-5 w-5 sm:h-7 sm:w-7"
                  />
                )}
                <span className="text-xl font-light sm:text-3xl">
                  {tokenSymbol}
                </span>
                <ChevronDownIcon
                  className={twMerge(
                    'h-3 w-3 text-gray-6 transition-transform duration-200',
                    open ? '-rotate-180' : 'rotate-0'
                  )}
                />
              </div>
            </Popover.Button>

            <Transition
              // we don't unmount on leave here because otherwise transition won't work with virtualized lists
              options={{ unmountOnLeave: false }}
              className="fixed left-0 top-0 z-50 lg:absolute lg:left-auto lg:right-0 lg:top-[76px] lg:max-w-[466px]"
            >
              <Popover.Panel
                className={twMerge(panelWrapperClassnames, 'px-5 py-4')}
              >
                {({ close }) => {
                  function onClose() {
                    onPopoverClose()
                    close()
                  }
                  return <TokenSearch close={onClose} />
                }}
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    </>
  )
}
