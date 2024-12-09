import { useMemo } from 'react'
import { Popover } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

import { useAppState } from '../../state'
import { TokenSearch } from '../TransferPanel/TokenSearch'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import {
  onPopoverButtonClick,
  onPopoverClose,
  panelWrapperClassnames
} from '../common/SearchPanel/SearchPanelUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { Transition } from '../common/Transition'
import { SafeImage } from '../common/SafeImage'
import { useTokensFromLists, useTokensFromUser } from './TokenSearchUtils'

export type TokenButtonOptions = {
  symbol?: string
  logoSrc?: string | null
  disabled?: boolean
}

export function TokenButton({
  options
}: {
  options?: TokenButtonOptions
}): JSX.Element {
  const {
    app: { selectedToken }
  } = useAppState()
  const disabled = options?.disabled ?? false

  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)

  const tokensFromLists = useTokensFromLists()
  const tokensFromUser = useTokensFromUser()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const tokenSymbol = useMemo(() => {
    if (typeof options?.symbol !== 'undefined') {
      return options.symbol
    }

    if (!selectedToken) {
      return nativeCurrency.symbol
    }

    return sanitizeTokenSymbol(selectedToken.symbol, {
      erc20L1Address: selectedToken.address,
      chainId: networks.sourceChain.id
    })
  }, [selectedToken, networks.sourceChain.id, nativeCurrency.symbol, options])

  const tokenLogoSrc = useMemo(() => {
    if (typeof options?.logoSrc !== 'undefined') {
      return options.logoSrc || nativeCurrency.logoUrl
    }

    if (selectedToken) {
      return (
        tokensFromLists[selectedToken.address]?.logoURI ??
        tokensFromUser[selectedToken.address]?.logoURI
      )
    }

    return nativeCurrency.logoUrl
  }, [
    nativeCurrency.logoUrl,
    options,
    selectedToken,
    tokensFromLists,
    tokensFromUser
  ])

  return (
    <>
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              className="arb-hover h-full w-max rounded-bl rounded-tl px-3 pb-1 pt-2 text-white"
              aria-label="Select Token"
              onClick={onPopoverButtonClick}
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <SafeImage
                  src={tokenLogoSrc}
                  alt={`${selectedToken?.symbol ?? nativeCurrency.symbol} logo`}
                  className="h-5 w-5 shrink-0"
                />
                <span className="text-xl font-light">{tokenSymbol}</span>
                {!disabled && (
                  <ChevronDownIcon
                    className={twMerge(
                      'h-3 w-3 text-gray-6 transition-transform duration-200',
                      open ? '-rotate-180' : 'rotate-0'
                    )}
                  />
                )}
              </div>
            </Popover.Button>

            <Transition
              // we don't unmount on leave here because otherwise transition won't work with virtualized lists
              options={{ unmountOnLeave: false }}
              className="fixed right-0 top-0 z-20 sm:absolute sm:top-[76px] sm:max-w-[466px]"
              afterLeave={onPopoverClose}
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
