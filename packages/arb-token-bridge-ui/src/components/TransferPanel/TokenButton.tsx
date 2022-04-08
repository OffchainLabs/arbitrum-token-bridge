import { useEffect, useMemo, useState } from 'react'

import { useAppState } from '../../state'
import { resolveTokenImg } from '../../util'
import { TokenImportModal } from '../TokenModal/TokenImportModal'
import { TokenModal } from '../TokenModal/TokenModal'
import { useNetworks, UseNetworksStatus } from '../../hooks/useNetworks'

export function TokenButton(): JSX.Element {
  const {
    app: {
      selectedToken,
      arbTokenBridge: { bridgeTokens },
      arbTokenBridgeLoaded
    }
  } = useAppState()
  const { status } = useNetworks()

  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const [tokenImportModalOpen, setTokenImportModalOpen] = useState(false)
  const [tokenToImport, setTokenToImport] = useState<string>()

  const tokenLogo = useMemo<string | undefined>(() => {
    const selectedAddress = selectedToken?.address
    if (!selectedAddress) {
      return 'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png'
    }
    if (status !== UseNetworksStatus.CONNECTED || !arbTokenBridgeLoaded) {
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
    <div>
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
        className="bg-white border border-gray-300 shadow-md active:shadow-sm rounded-md py-2 px-4"
      >
        <div className="flex items-center whitespace-nowrap flex-nowrap ">
          <div>Token:</div>
          {tokenLogo && (
            <img
              src={tokenLogo}
              alt="Token logo"
              className="rounded-full w-5 h-5 mx-1"
            />
          )}
          <div>{selectedToken ? selectedToken.symbol : 'Eth'}</div>
        </div>
      </button>
    </div>
  )
}
