import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'

import { Button } from './Button'

const localStorageKey = 'arbitrum-custom-networks'

type CustomNetwork = {
  l1Network?: L1Network
  l2Network: L2Network
}

export const AddCustomNetwork = () => {
  const [customNetworks, setCustomNetworks] = useState<CustomNetwork[]>(
    getNetworksFromLocalStorage()
  )
  const [networksJson, setNetworksJson] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const storedCustomNetworks = getNetworksFromLocalStorage()

  function onAddNetwork() {
    setError(null)

    try {
      const networks = (
        networksJson
          ? JSON.parse(networksJson.replace(/[\r\n]+/g, ''))
          : undefined
      ) as CustomNetwork

      if (networks.l1Network) {
        networks.l1Network.isCustom = true
      }

      networks.l2Network.isCustom = true

      addCustomNetwork({
        customL1Network: networks.l1Network,
        customL2Network: networks.l2Network
      })

      saveNetworkToLocalStorage(networks)
    } catch (error: any) {
      setError(error.message ?? 'Something went wrong')
    }
  }

  function getNetworksFromLocalStorage(): CustomNetwork[] {
    const customNetworks = localStorage.getItem(localStorageKey)

    if (customNetworks) {
      return JSON.parse(customNetworks)
    }

    return []
  }

  function saveNetworkToLocalStorage(customNetwork: CustomNetwork) {
    const customNetworks = getNetworksFromLocalStorage()
    const newCustomNetworks = [...customNetworks, customNetwork]
    localStorage.setItem(localStorageKey, JSON.stringify(newCustomNetworks))
    setCustomNetworks(newCustomNetworks)
  }

  function removeNetworkFromLocalStorage(l2ChainId: number) {
    const customNetworks = getNetworksFromLocalStorage()
    const newCustomNetworks = customNetworks.filter(
      network => network.l2Network.chainID !== l2ChainId
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
            <span className="w-4/12">L1 Network</span>
            <span className="w-4/12">L2 Network</span>
          </div>
          {storedCustomNetworks.map(network => (
            <div className="relative flex w-full flex-col border-b border-gray-700">
              <div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Name</span>
                  <span className="w-4/12 opacity-40">
                    {network.l1Network?.name}
                  </span>
                  <span className="w-4/12 opacity-40">
                    {network.l2Network.name}
                  </span>
                </div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Chain ID</span>
                  <span className="w-4/12 opacity-40">
                    {network.l1Network?.chainID}
                  </span>
                  <span className="w-4/12 opacity-40">
                    {network.l2Network.chainID}
                  </span>
                </div>
              </div>
              <div className="absolute bottom-4 right-0 flex justify-end">
                <button
                  onClick={() =>
                    removeNetworkFromLocalStorage(network.l2Network.chainID)
                  }
                >
                  <XMarkIcon className="text-error" width={16} />
                </button>
              </div>
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
