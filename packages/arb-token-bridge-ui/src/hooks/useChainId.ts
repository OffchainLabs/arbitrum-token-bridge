import { useState, useEffect } from 'react'
import { providers } from 'ethers'

export function useChainId({ provider }: { provider: providers.Provider }) {
  const [chainId, setChainId] = useState<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    async function updateChainId() {
      const network = await provider.getNetwork()
      if (!cancelled) {
        setChainId(network.chainId)
      }
    }

    updateChainId()

    return () => {
      cancelled = true
    }
  }, [provider])

  return chainId
}
