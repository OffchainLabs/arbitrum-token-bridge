import { useState } from 'react'
import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'

import { Button } from './Button'

const localStorageKey = 'arbitrum-custom-networks'

type CustomNetwork = {
  l1Network?: L1Network
  l2Network: L2Network
}

const templateNetworkJson = {
  chainID: '',
  name: '',
  explorerUrl: '',
  partnerChainIDs: [''],
  blockTime: ''
}

const NetworkTextArea = ({
  networkType,
  onChange
}: {
  networkType: 'L1' | 'L2'
  onChange: (value: string) => void
}) => {
  const optional = networkType === 'L1'

  return (
    <div>
      <span className="text-sm opacity-40">
        {networkType} Network {optional && '(optional)'}
      </span>
      <textarea
        defaultValue={JSON.stringify(templateNetworkJson)}
        onChange={e => onChange(e.target.value)}
        className="min-h-[100px] w-full rounded-lg p-1 text-black"
      />
    </div>
  )
}

export const AddCustomNetwork = () => {
  const [l1NetworkJson, setL1NetworkJson] = useState<string>(
    JSON.stringify(templateNetworkJson)
  )
  const [l2NetworkJson, setL2NetworkJson] = useState<string>(
    JSON.stringify(templateNetworkJson)
  )
  const [error, setError] = useState<string | null>(null)

  function onAddNetwork() {
    setError(null)

    try {
      const l1Network =
        l1NetworkJson && JSON.parse(l1NetworkJson.replace(/[\r\n]+/g, ''))
      const l2Network = JSON.parse(l2NetworkJson.replace(/[\r\n]+/g, ''))

      if (l1Network) {
        l1Network.isCustom = true
        l1Network.isArbitrum = false
      }

      l2Network.isCustom = true
      l2Network.isArbitrum = false

      addCustomNetwork({
        customL1Network: l1Network,
        customL2Network: l2Network
      })
    } catch (error: any) {
      setError(error.message || 'Something went wrong')
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
    localStorage.setItem(
      localStorageKey,
      JSON.stringify({ ...customNetworks, customNetwork })
    )
  }

  return (
    <>
      <NetworkTextArea networkType="L1" onChange={setL1NetworkJson} />
      <NetworkTextArea networkType="L2" onChange={setL2NetworkJson} />
      {error && <span className="text-sm text-error">{error}</span>}
      <div>
        <Button onClick={onAddNetwork} variant="primary">
          Add Network
        </Button>
      </div>
    </>
  )
}
