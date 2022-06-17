import { useEffect, useMemo, useState } from 'react'
import { Popover, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/outline'

import { useAppState } from '../../state'
import { resolveTokenImg } from '../../util'
import { TokenImportModal } from '../TokenModal/TokenImportModal'
import { TokenModal } from '../TokenModal/TokenModal'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'

export function TokenButton(): JSX.Element {
  const {
    app: {
      selectedToken,
      arbTokenBridge: { bridgeTokens },
      arbTokenBridgeLoaded
    }
  } = useAppState()
  const { status } = useNetworksAndSigners()

  const [tokenImportModalOpen, setTokenImportModalOpen] = useState(false)
  const [tokenToImport, setTokenToImport] = useState<string>()

  const tokenLogo = useMemo<string | undefined>(() => {
    const selectedAddress = selectedToken?.address
    if (!selectedAddress) {
      return 'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png'
    }
    if (
      status !== UseNetworksAndSignersStatus.CONNECTED ||
      !arbTokenBridgeLoaded
    ) {
      return undefined
    }
    const logo = bridgeTokens[selectedAddress]?.logoURI
    if (logo) {
      return resolveTokenImg(logo)
    }
    return undefined
  }, [selectedToken?.address, status, arbTokenBridgeLoaded])

  // Reset the token back to undefined every time the modal closes
  useEffect(() => {
    if (!tokenImportModalOpen) {
      setTokenToImport(undefined)
    }
  }, [tokenImportModalOpen])

  function handleImportToken(address: string) {
    setTokenToImport(address)
    setTokenImportModalOpen(true)
  }

  return (
    <>
      {typeof tokenToImport !== 'undefined' && (
        <TokenImportModal
          isOpen={tokenImportModalOpen}
          setIsOpen={setTokenImportModalOpen}
          address={tokenToImport}
        />
      )}
      <Popover className="h-full">
        <Popover.Button className="arb-hover h-full w-max rounded-tl-xl rounded-bl-xl bg-white px-3 hover:bg-v3-gray-2">
          <div className="flex items-center space-x-2">
            {tokenLogo && (
              <img
                src={tokenLogo}
                alt="Token logo"
                className="h-5 w-5 rounded-full lg:h-8 lg:w-8"
              />
            )}
            <span className="text-lg font-light lg:text-3xl">
              {selectedToken ? selectedToken.symbol : 'ETH'}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-v3-gray-9" />
          </div>
        </Popover.Button>
        <Transition>
          <Popover.Panel className="top-100px lg:shadow-select-token-popover lg:w-466px absolute left-0 z-50 w-full bg-white px-6 py-4 lg:left-auto lg:top-auto lg:h-auto lg:rounded-lg lg:p-6">
            {({ close }) => (
              <TokenModal close={close} onImportToken={handleImportToken} />
            )}
          </Popover.Panel>
        </Transition>
      </Popover>
    </>
  )
}
