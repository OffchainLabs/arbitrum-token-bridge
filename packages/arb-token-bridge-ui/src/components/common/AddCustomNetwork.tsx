import { useState } from 'react'
import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'

import { Button } from './Button'

export const localStorageKey = 'arbitrum-custom-networks'

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

      if (!networks.l2Network) {
        throw new Error("'l2Network' property is missing")
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
    const customNetworks = sessionStorage.getItem(localStorageKey)

    if (customNetworks) {
      return JSON.parse(customNetworks)
    }

    return []
  }

  function saveNetworkToLocalStorage(customNetwork: CustomNetwork) {
    const customNetworksFromLocalStorage = getNetworksFromLocalStorage()
    const newCustomNetworks = [...customNetworksFromLocalStorage, customNetwork]
    sessionStorage.setItem(localStorageKey, JSON.stringify(newCustomNetworks))
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
          {customNetworks.map(network => (
            <div className="relative flex w-full flex-col border-b border-gray-700">
              <div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Name:</span>
                  <span className="w-5/12 opacity-40">
                    {network.l1Network?.name ?? '-'}
                  </span>
                  <span className="w-5/12 opacity-40">
                    {network.l2Network.name ?? '-'}
                  </span>
                </div>
                <div className="flex w-full">
                  <span className="w-2/12 opacity-40">Chain ID:</span>
                  <span className="w-5/12 opacity-40">
                    {network.l1Network?.chainID ?? '-'}
                  </span>
                  <span className="w-5/12 opacity-40">
                    {network.l2Network.chainID ?? '-'}
                  </span>
                </div>
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
