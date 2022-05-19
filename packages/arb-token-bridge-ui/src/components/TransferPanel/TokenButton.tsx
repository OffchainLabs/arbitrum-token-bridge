import { useEffect, useMemo, useState } from 'react'

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

  const [tokenModalOpen, setTokenModalOpen] = useState(false)
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
      <TokenModal
        isOpen={tokenModalOpen}
        setIsOpen={setTokenModalOpen}
        onImportToken={handleImportToken}
      />
      {typeof tokenToImport !== 'undefined' && (
        <TokenImportModal
          isOpen={tokenImportModalOpen}
          setIsOpen={setTokenImportModalOpen}
          address={tokenToImport}
        />
      )}
      <button
        type="button"
        onClick={() => setTokenModalOpen(true)}
        className="px-3 bg-white hover:bg-v3-gray-2 rounded-tl-xl rounded-bl-xl h-full"
      >
        <div className="flex items-center space-x-2">
          {tokenLogo && (
            <img
              src={tokenLogo}
              alt="Token logo"
              className="rounded-full w-5 lg:w-8 h-5 lg:h-8"
            />
          )}
          <span className="font-light text-lg lg:text-3xl">
            {selectedToken ? selectedToken.symbol : 'ETH'}
          </span>
        </div>
      </button>
    </>
  )
}
