import { useMemo, useState } from 'react'
import { Popover } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/outline'

import { useAppState } from '../../state'
import { sanitizeImageSrc } from '../../util'
import { TokenImportDialog } from './TokenImportDialog'
import { TokenSearch } from '../TransferPanel/TokenSearch'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'
import { useDialog } from '../common/Dialog'

export function TokenButton(): JSX.Element {
  const {
    app: {
      selectedToken,
      arbTokenBridge: { bridgeTokens },
      arbTokenBridgeLoaded
    }
  } = useAppState()
  const { status } = useNetworksAndSigners()

  const [tokenToImport, setTokenToImport] = useState<string>()
  const [tokenImportDialogProps, openTokenImportDialog] = useDialog()

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
      return sanitizeImageSrc(logo)
    }
    return undefined
  }, [selectedToken?.address, status, arbTokenBridgeLoaded])

  function closeWithReset() {
    setTokenToImport(undefined)
    tokenImportDialogProps.onClose(false)
  }

  function importToken(address: string) {
    setTokenToImport(address)
    openTokenImportDialog()
  }

  return (
    <>
      {typeof tokenToImport !== 'undefined' && (
        <TokenImportDialog
          {...tokenImportDialogProps}
          onClose={closeWithReset}
          address={tokenToImport}
        />
      )}

      <Popover className="h-full">
        <Popover.Button className="arb-hover h-full w-max rounded-tl-xl rounded-bl-xl bg-white px-3 hover:bg-gray-2">
          <div className="flex items-center space-x-2">
            {tokenLogo && (
              <img
                src={tokenLogo}
                alt="Token logo"
                className="h-5 w-5 rounded-full sm:h-8 sm:w-8"
              />
            )}
            <span className="text-xl font-light sm:text-3xl">
              {selectedToken ? selectedToken.symbol : 'ETH'}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-gray-9" />
          </div>
        </Popover.Button>
        <Popover.Panel className="absolute top-0 left-0 z-50 h-full w-full bg-white px-6 py-4 lg:left-auto lg:top-auto lg:h-auto lg:w-[466px] lg:rounded-lg lg:p-6 lg:shadow-[0px_4px_12px_#9e9e9e]">
          {({ close }) => (
            <TokenSearch close={close} onImportToken={importToken} />
          )}
        </Popover.Panel>
      </Popover>
    </>
  )
}
