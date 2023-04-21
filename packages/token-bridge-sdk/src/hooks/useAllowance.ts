import { providers } from 'ethers'
import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

import { getL1TokenData } from '../util'
import { ArbTokenBridge } from '../hooks/arbTokenBridge.types'

const useAllowance = ({
  arbTokenBridge,
  l1Provider,
  l2Provider,
  erc20L1Address,
  erc20L2Address,
  walletAddress
}: {
  arbTokenBridge?: ArbTokenBridge
  l1Provider?: providers.Provider
  l2Provider: providers.Provider
  erc20L1Address?: string
  erc20L2Address?: string
  walletAddress: string
}) => {
  // ============ L1 ============
  const queryKeyL1 = useMemo(() => {
    if (!l1Provider || !l2Provider || !erc20L1Address || !walletAddress) {
      // Don't fetch
      return null
    }

    return 'allowanceL1'
  }, [l1Provider, l2Provider, erc20L1Address, walletAddress])

  const fetchL1Data = useCallback(
    () =>
      getL1TokenData({
        account: walletAddress,
        erc20L1Address: String(erc20L1Address),
        l1Provider: l1Provider!,
        l2Provider,
        // its ok to skip cache, swr does it for us
        // also allows us to use mutate accurately
        skipCache: true
      }),
    [l1Provider, l2Provider, erc20L1Address, walletAddress]
  )

  const { data: tokenDataL1, mutate: mutateL1 } = useSWR(
    queryKeyL1,
    fetchL1Data,
    {
      refreshInterval: 5_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  const updateL1 = useCallback(async () => {
    const data = await fetchL1Data()
    return mutateL1(data, {
      populateCache(result, currentData) {
        return {
          ...currentData,
          ...result
        }
      },
      revalidate: false
    })
  }, [fetchL1Data, mutateL1])

  // ============ L2 ============

  const queryKeyL2 = useMemo(() => {
    if (
      !arbTokenBridge ||
      !l2Provider ||
      !erc20L1Address ||
      !erc20L2Address ||
      !walletAddress
    ) {
      // Don't fetch
      return null
    }

    return 'allowanceL2'
  }, [
    arbTokenBridge,
    l2Provider,
    erc20L1Address,
    erc20L2Address,
    walletAddress
  ])

  const fetchL2Data = useCallback(async () => {
    const token = ERC20__factory.connect(String(erc20L2Address), l2Provider)
    const gatewayAddress = await arbTokenBridge!.token.getL2GatewayAddress(
      String(erc20L1Address)
    )
    return token.allowance(walletAddress, gatewayAddress)
  }, [
    arbTokenBridge,
    erc20L1Address,
    erc20L2Address,
    l2Provider,
    walletAddress
  ])

  const { data: allowanceL2, mutate: mutateL2 } = useSWR(
    queryKeyL2,
    fetchL2Data,
    {
      refreshInterval: 5_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  const updateL2 = useCallback(async () => {
    const data = await fetchL2Data()
    return mutateL2(data, {
      populateCache(result, currentData) {
        return {
          ...currentData,
          ...result
        }
      },
      revalidate: false
    })
  }, [fetchL2Data, mutateL2])

  return {
    l1: tokenDataL1?.allowance || null,
    l2: allowanceL2 || null,
    updateL1,
    updateL2
  }
}

export { useAllowance }
