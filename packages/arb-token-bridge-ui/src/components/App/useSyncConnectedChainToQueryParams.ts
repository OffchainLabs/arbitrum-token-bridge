import { useState, useEffect, useCallback } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import {
  DisabledFeatures,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'
import { sanitizeQueryParams } from '../../hooks/useNetworks'
import { onDisconnectHandler } from '../../util/walletConnectUtils'
import { getNetworkName } from '../../util/networks'
import { useDisabledFeatures } from '../../hooks/useDisabledFeatures'
import { getAccountType } from '../../util/AccountUtils'

export function useSyncConnectedChainToQueryParams() {
  const { address, chain } = useAccount()
  const [shouldSync, setShouldSync] = useState(false)
  const [didSync, setDidSync] = useState(false)
  const { disconnect } = useDisconnect({
    mutation: {
      onSettled: onDisconnectHandler
    }
  })
  const { isFeatureDisabled } = useDisabledFeatures()

  const [{ sourceChain, destinationChain }, setQueryParams] =
    useArbQueryParams()

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS
  )

  const setSourceChainToConnectedChain = useCallback(() => {
    if (typeof chain === 'undefined') {
      return
    }

    const { sourceChainId: sourceChain, destinationChainId: destinationChain } =
      sanitizeQueryParams({
        sourceChainId: chain.id,
        destinationChainId: undefined,
        disableTransfersToNonArbitrumChains
      })

    setQueryParams({ sourceChain, destinationChain })
  }, [chain, setQueryParams, disableTransfersToNonArbitrumChains])

  useEffect(() => {
    async function checkCorrectChainForSmartContractWallet() {
      if (typeof chain === 'undefined') {
        return
      }
      if (!address) {
        return
      }
      const accountType = await getAccountType({
        address,
        chainId: chain.id
      })
      if (accountType === 'smart-contract-wallet' && sourceChain !== chain.id) {
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
