import { useState, useEffect } from 'react'
import { useNetwork } from 'wagmi'

import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { sanitizeQueryParams } from '../../hooks/useNetworks'

export function ConnectedChainQueryParamsSyncer() {
  const [shouldSync, setShouldSync] = useState(false)
  const [didSync, setDidSync] = useState(false)

  const { chain } = useNetwork()
  const [{ sourceChain, destinationChain }, setQueryParams] =
    useArbQueryParams()

  useEffect(() => {
    if (shouldSync) {
      return
    }

    // Only sync connected chain to query params if the query params were not initially provided
    if (
      typeof sourceChain === 'undefined' &&
      typeof destinationChain === 'undefined'
    ) {
      setShouldSync(true)
    }
  }, [shouldSync, sourceChain, destinationChain])

  useEffect(() => {
    // When the chain is connected and we should sync, and we haven't synced yet, sync the connected chain to the query params
    if (chain && shouldSync && !didSync) {
      const {
        sourceChainId: sourceChain,
        destinationChainId: destinationChain
      } = sanitizeQueryParams({
        sourceChainId: chain.id,
        destinationChainId: undefined
      })

      setQueryParams({ sourceChain, destinationChain })
      setDidSync(true)
    }
  }, [chain, shouldSync, didSync, setQueryParams])

  return null
}
