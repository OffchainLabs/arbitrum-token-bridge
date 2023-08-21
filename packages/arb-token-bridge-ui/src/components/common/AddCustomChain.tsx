import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Chain, ParentChain, addCustomChain } from '@arbitrum/sdk'

import { Button } from './Button'

export const localStorageKey = 'arbitrum-custom-chains'

type CustomChains = {
  parentChain?: ParentChain
  chain: Chain
}

export function getCustomChainsFromLocalStorage(): CustomChains[] {
  const customNetworksFromLocalStorage = localStorage.getItem(localStorageKey)

  if (customNetworksFromLocalStorage) {
    return JSON.parse(customNetworksFromLocalStorage)
  }

  return []
}

export const AddCustomChain = () => {
  const [customChains, setCustomChains] = useState<CustomChains[]>(
    getCustomChainsFromLocalStorage()
  )
  const [chainsJson, setChainsJson] = useState<string>('')
  const [needsReload, setNeedsReload] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onAddChain() {
    setError(null)

    try {
      const chains = (
        chainsJson.trim()
          ? JSON.parse(chainsJson.replace(/[\r\n]+/g, ''))
          : undefined
      ) as CustomChains

      if (!chains) {
        throw new Error('JSON input is empty')
      }

      if (chains.parentChain) {
        chains.parentChain.isCustom = true
      }

      if (!chains.chain) {
        throw new Error("'chain' property is missing")
      }

      chains.chain.isCustom = true

      addCustomChain({
        customParentChain: chains.parentChain,
        customChain: chains.chain
      })

      saveCustomChainToLocalStorage(chains)
    } catch (error: any) {
      setError(error.message ?? 'Something went wrong')
    }
  }

  function saveCustomChainToLocalStorage(customNetwork: CustomChains) {
    const newCustomChains = [
      ...getCustomChainsFromLocalStorage(),
      customNetwork
    ]
    localStorage.setItem(localStorageKey, JSON.stringify(newCustomChains))
    setCustomChains(newCustomChains)
  }

  function removeCustomChainFromLocalStorage(chainId: number) {
    const newCustomChains = getCustomChainsFromLocalStorage().filter(
      chains => chains.chain.chainID !== chainId
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
          {customChains.map(chains => (
            <div
              key={`chain-${chains.chain.chainID}`}
              className="relative flex w-full flex-col border-b border-gray-700"
            >
              <div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Name:</span>
                  <span className="w-5/12 opacity-40">
                    {chains.parentChain?.name ?? '-'}
                  </span>
                  <span className="w-5/12 opacity-40">
                    {chains.chain.name ?? '-'}
                  </span>
                </div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Chain ID:</span>
                  <span className="w-5/12 opacity-40">
                    {chains.parentChain?.chainID ?? '-'}
                  </span>
                  <span className="w-5/12 opacity-40">
                    {chains.chain.chainID ?? '-'}
                  </span>
                </div>
              </div>
              <button
                onClick={() =>
                  removeCustomChainFromLocalStorage(chains.chain.chainID)
                }
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
