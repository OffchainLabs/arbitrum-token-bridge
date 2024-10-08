import { useState, useEffect, useCallback } from 'react'
import { useAccount, useDisconnect, useNetwork } from 'wagmi'

import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { sanitizeQueryParams } from '../../hooks/useNetworks'
import { onDisconnectHandler } from '../../util/walletConnectUtils'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { getNetworkName } from '../../util/networks'

export function useSyncConnectedChainToQueryParams() {
  const { address } = useAccount()
  const [shouldSync, setShouldSync] = useState(false)
  const [didSync, setDidSync] = useState(false)
  const { disconnect } = useDisconnect({
    onSettled: onDisconnectHandler
  })

  const [{ sourceChain, destinationChain }, setQueryParams] =
    useArbQueryParams()
  const { chain } = useNetwork()

  const setSourceChainToConnectedChain = useCallback(() => {
    if (typeof chain === 'undefined') {
      return
    }

    const { sourceChainId: sourceChain, destinationChainId: destinationChain } =
      sanitizeQueryParams({
        sourceChainId: chain.id,
        destinationChainId: undefined
      })

    setQueryParams({ sourceChain, destinationChain })
  }, [chain, setQueryParams])

  useEffect(() => {
    async function checkCorrectChainForSmartContractWallet() {
      if (typeof chain === 'undefined') {
        return
      }
      if (!address) {
        return
      }
      const isSmartContractWallet = await addressIsSmartContract(
        address,
        chain.id
      )
      if (isSmartContractWallet && sourceChain !== chain.id) {
        const chainName = getNetworkName(chain.id)

        setSourceChainToConnectedChain()

        window.alert(
          `You're connected to the app with a smart contract wallet on ${chainName}. In order to properly enable transfers, the app will now reload.\n\nPlease reconnect after the reload.`
        )
        disconnect()
      }
    }

    checkCorrectChainForSmartContractWallet()
  }, [
    address,
    chain,
    disconnect,
    setQueryParams,
    setSourceChainToConnectedChain,
    sourceChain
  ])

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
      setSourceChainToConnectedChain()
      setDidSync(true)
    }
  }, [
    chain,
    shouldSync,
    didSync,
    setQueryParams,
    setSourceChainToConnectedChain
  ])
}
