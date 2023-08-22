import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Chain, L2Network, addCustomChain } from '@arbitrum/sdk'

import { Button } from './Button'
import { ChainWithRpcUrl, getNetworkName } from '../../util/networks'

export const localStorageKey = 'arbitrum-custom-chains'

const jsonPlaceholder = `{ chainID: 0, name: 'MyChain', partnerChainID: 0, ...other_properties }`

// allow only Ethereum testnets and Arbitrum testnets as parent chains
const allowedParentChainIds = [5, 11155111, 1337, 421613, 421614, 412346]

export function getCustomChainsFromLocalStorage(): ChainWithRpcUrl[] {
  const customNetworksFromLocalStorage = localStorage.getItem(localStorageKey)

  if (customNetworksFromLocalStorage) {
    return (JSON.parse(customNetworksFromLocalStorage) as ChainWithRpcUrl[])
      .filter(
        // filter again in case local storage is compromized
        chain => !allowedParentChainIds.includes(Number(chain.chainID))
      )
      .map(chain => {
        return {
          ...chain,
          // make sure chainID is numeric
          chainID: Number(chain.chainID)
        }
      })
  }

  return []
}

export const AddCustomChain = () => {
  const [customChains, setCustomChains] = useState<Chain[]>(
    getCustomChainsFromLocalStorage()
  )
  const [chainJson, setChainJson] = useState<string>('')
  const [rpcUrl, setRpcUrl] = useState<string>('')
  const [needsReload, setNeedsReload] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onAddChain() {
    setError(null)

    try {
      const data = (
        chainJson.trim()
          ? JSON.parse(chainJson.replace(/[\r\n]+/g, ''))
          : undefined
      ) as Chain

      if (!data) {
        throw new Error('JSON input is empty.')
      }

      if (!rpcUrl) {
        throw new Error('RPC URL is required.')
      }

      // we assume provided json a Chain object
      let chain = data

      // however, users might want to just copy the result of genNetwork which has a nested 'l2Network' property
      // in that case we want to read 'l2Network'
      if ((data as unknown as { l2Network: L2Network }).l2Network) {
        chain = (data as unknown as { l2Network: L2Network }).l2Network
      }

      // also looking for an 'l3Network'
      if ((data as unknown as { l3Network: L2Network }).l3Network) {
        chain = (data as unknown as { l3Network: L2Network }).l3Network
      }

      // same case but in case user provided a 'chain'
      if ((data as unknown as { chain: Chain }).chain) {
        chain = (data as unknown as { chain: Chain }).chain
      }

      if (!allowedParentChainIds.includes(Number(chain.partnerChainID))) {
        throw new Error(
          `Invalid partnerChainID ${chain.partnerChainID}. Only Ethereum testnet and Arbitrum testnet parent chains are allowed.`
        )
      }

      chain.isCustom = true

      addCustomChain({ customChain: chain })
      saveCustomChainToLocalStorage({ ...chain, rpcUrl })
      setNeedsReload(true)
    } catch (error: any) {
      setError(error.message ?? 'Something went wrong.')
    }
  }

  function saveCustomChainToLocalStorage(newCustomChain: ChainWithRpcUrl) {
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
          <span>To apply the changes, please reload the page.</span>
        </div>
      )}
      <div className="flex flex-col">
        <h3>JSON Config</h3>
        <textarea
          onChange={e => setChainJson(e.target.value)}
          placeholder={jsonPlaceholder}
          className="min-h-[100px] w-full rounded-lg p-1 text-black"
        />
      </div>
      <div className="mt-2 flex flex-col">
        <h3>RPC URL</h3>
        <input
          onChange={e => setRpcUrl(e.target.value)}
          className="w-full rounded-lg p-1 text-black"
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
