import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Chain, addCustomChain } from '@arbitrum/sdk'

import { Button } from './Button'
import { ChainId, getNetworkName } from '../../util/networks'

export const localStorageKey = 'arbitrum-custom-chains'

const jsonPlaceholder = {
  chainID: 0,
  name: 'MyChain',
  partnerChainID: 0,
  otherProperties: '. . .'
}

// allow only Ethereum testnets and Arbitrum testnets as parent chains
const allowedParentChainIds = [
  ChainId.Goerli,
  ChainId.Sepolia,
  ChainId.Local,
  ChainId.ArbitrumGoerli,
  ChainId.ArbitrumSepolia,
  ChainId.ArbitrumLocal
]

export function getCustomChainsFromLocalStorage(): Chain[] {
  const customNetworksFromLocalStorage = localStorage.getItem(localStorageKey)

  if (customNetworksFromLocalStorage) {
    return JSON.parse(customNetworksFromLocalStorage)
  }

  return []
}

export const AddCustomChain = () => {
  const [customChains, setCustomChains] = useState<Chain[]>(
    getCustomChainsFromLocalStorage()
  )
  const [chainsJson, setChainsJson] = useState<string>('')
  const [needsReload, setNeedsReload] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onAddChain() {
    setError(null)

    try {
      const chain = (
        chainsJson.trim()
          ? JSON.parse(chainsJson.replace(/[\r\n]+/g, ''))
          : undefined
      ) as Chain

      if (!chain) {
        throw new Error('JSON input is empty.')
      }

      if (!allowedParentChainIds.includes(Number(chain.partnerChainID))) {
        throw new Error(
          `Invalid partnerChainID ${chain.partnerChainID}. Only Ethereum testnet and Arbitrum testnet parent chains are allowed.`
        )
      }

      chain.isCustom = true

      addCustomChain({
        customChain: chain
      })

      saveCustomChainToLocalStorage(chain)
    } catch (error: any) {
      setError(error.message ?? 'Something went wrong.')
    }
  }

  function saveCustomChainToLocalStorage(newCustomChain: Chain) {
    const newCustomChains = [
      ...getCustomChainsFromLocalStorage(),
      newCustomChain
    ]
    localStorage.setItem(localStorageKey, JSON.stringify(newCustomChains))
    setCustomChains(newCustomChains)
  }

  function removeCustomChainFromLocalStorage(chainId: number) {
    const newCustomChains = getCustomChainsFromLocalStorage().filter(
      chain => chain.chainID !== chainId
    )
    localStorage.setItem(localStorageKey, JSON.stringify(newCustomChains))
    setCustomChains(newCustomChains)
    setNeedsReload(true)
  }

  return (
    <>
      {customChains.length > 0 && (
        <div className="mb-4 w-full">
          <div className="flex w-full">
            <span className="w-2/12" />
            <span className="w-5/12">Parent Chain</span>
            <span className="w-5/12">Chain</span>
          </div>
          {customChains.map(chain => (
            <div
              key={`chain-${chain.chainID}`}
              className="relative flex w-full flex-col border-b border-gray-700"
            >
              <div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Name:</span>
                  <span className="w-5/12 opacity-40">
                    {getNetworkName(Number(chain.partnerChainID))}
                  </span>
                  <span className="w-5/12 opacity-40">{chain.name ?? '-'}</span>
                </div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Chain ID:</span>
                  <span className="w-5/12 opacity-40">
                    {chain.partnerChainID}
                  </span>
                  <span className="w-5/12 opacity-40">
                    {chain.chainID ?? '-'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeCustomChainFromLocalStorage(chain.chainID)}
                className="arb-hover absolute bottom-4 right-0 text-error"
              >
                <XMarkIcon width={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {needsReload && (
        <div className="mb-2 text-xs text-yellow-400">
          <span>
            To apply the removal of the custom chain, please reload the page.
          </span>
        </div>
      )}
      <div>
        <textarea
          onChange={e => setChainsJson(e.target.value)}
          placeholder={JSON.stringify(jsonPlaceholder)}
          className="min-h-[100px] w-full rounded-lg p-1 text-black"
        />
      </div>
      {error && <span className="text-sm text-error">{error}</span>}
      <div>
        <Button onClick={onAddChain} variant="primary">
          Add Chain
        </Button>
      </div>
    </>
  )
}
