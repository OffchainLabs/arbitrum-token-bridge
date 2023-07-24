import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'

import { Button } from './Button'

export const localStorageKey = 'arbitrum-custom-networks'

type CustomNetwork = {
  l1Network?: L1Network
  l2Network: L2Network
}

export const AddCustomNetwork = () => {
  const [customNetworks, setCustomNetworks] = useState<CustomNetwork[]>(
    getCustomNetworksFromLocalStorage()
  )
  const [networksJson, setNetworksJson] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // custom networks do not persists between sessions
    // we add locally stored custom networks
    try {
      getCustomNetworksFromLocalStorage().forEach(networks =>
        addCustomNetwork({
          customL1Network: networks.l1Network,
          customL2Network: networks.l2Network
        })
      )
    } catch (error: any) {
      //
    }
  }, [])

  function onAddNetwork() {
    setError(null)

    try {
      const networks = (
        networksJson.trim()
          ? JSON.parse(networksJson.replace(/[\r\n]+/g, ''))
          : undefined
      ) as CustomNetwork

      if (!networks) {
        throw new Error('JSON input is empty')
      }

      if (networks.l1Network) {
        networks.l1Network.isCustom = true
      }

      if (!networks.l2Network) {
        throw new Error("'l2Network' property is missing")
      }

      networks.l2Network.isCustom = true

      addCustomNetwork({
        customL1Network: networks.l1Network,
        customL2Network: networks.l2Network
      })

      saveCustomNetworkToLocalStorage(networks)
    } catch (error: any) {
      setError(error.message ?? 'Something went wrong')
    }
  }

  function getCustomNetworksFromLocalStorage(): CustomNetwork[] {
    const customNetworksFromLocalStorage = localStorage.getItem(localStorageKey)

    if (customNetworksFromLocalStorage) {
      return JSON.parse(customNetworksFromLocalStorage)
    }

    return []
  }

  function saveCustomNetworkToLocalStorage(customNetwork: CustomNetwork) {
    const customNetworksFromLocalStorage = getCustomNetworksFromLocalStorage()
    const newCustomNetworks = [...customNetworksFromLocalStorage, customNetwork]
    localStorage.setItem(localStorageKey, JSON.stringify(newCustomNetworks))
    setCustomNetworks(newCustomNetworks)
  }

  function removeCustomNetworkFromLocalStorage(l2ChainId: number) {
    const customNetworksFromLocalStorage = getCustomNetworksFromLocalStorage()
    const newCustomNetworks = customNetworksFromLocalStorage.filter(
      networks => networks.l2Network.chainID !== l2ChainId
    )
    localStorage.setItem(localStorageKey, JSON.stringify(newCustomNetworks))
    setCustomNetworks(newCustomNetworks)
  }

  return (
    <>
      {customNetworks.length > 0 && (
        <div className="mb-4 w-full">
          <div className="flex w-full">
            <span className="w-2/12" />
            <span className="w-5/12">L1 Network</span>
            <span className="w-5/12">L2 Network</span>
          </div>
          {customNetworks.map(networks => (
            <div className="relative flex w-full flex-col border-b border-gray-700">
              <div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Name:</span>
                  <span className="w-5/12 opacity-40">
                    {networks.l1Network?.name ?? '-'}
                  </span>
                  <span className="w-5/12 opacity-40">
                    {networks.l2Network.name ?? '-'}
                  </span>
                </div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Chain ID:</span>
                  <span className="w-5/12 opacity-40">
                    {networks.l1Network?.chainID ?? '-'}
                  </span>
                  <span className="w-5/12 opacity-40">
                    {networks.l2Network.chainID ?? '-'}
                  </span>
                </div>
              </div>
              <button
                onClick={() =>
                  removeCustomNetworkFromLocalStorage(
                    networks.l2Network.chainID
                  )
                }
                className="arb-hover absolute bottom-4 right-0 text-error"
              >
                <XMarkIcon width={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div>
        <textarea
          onChange={e => setNetworksJson(e.target.value)}
          className="min-h-[100px] w-full rounded-lg p-1 text-black"
        />
      </div>
      {error && <span className="text-sm text-error">{error}</span>}
      <div>
        <Button onClick={onAddNetwork} variant="primary">
          Add Network
        </Button>
      </div>
    </>
  )
}
