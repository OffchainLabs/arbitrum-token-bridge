import React, { useMemo, useState } from 'react'

import { useAppState } from '../../state'
import { resolveTokenImg } from '../../util'
import { TokenModal } from '../TokenModal/TokenModal'

const TokenButton = (): JSX.Element => {
  const {
    app: {
      selectedToken,
      networkID,
      arbTokenBridge: { bridgeTokens },
      arbTokenBridgeLoaded
    }
  } = useAppState()
  const [tokeModalOpen, setTokenModalOpen] = useState(false)

  const tokenLogo = useMemo<string | undefined>(() => {
    const selectedAddress = selectedToken?.address
    if (!selectedAddress) {
      return 'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png'
    }
    if (networkID === null || !arbTokenBridgeLoaded) {
      return undefined
    }
    const logo = bridgeTokens[selectedAddress]?.logoURI
    if (logo) {
      return resolveTokenImg(logo)
    }
    return undefined
  }, [selectedToken?.address, networkID])

  return (
    <div>
      <TokenModal isOpen={tokeModalOpen} setIsOpen={setTokenModalOpen} />
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

export { TokenButton }
