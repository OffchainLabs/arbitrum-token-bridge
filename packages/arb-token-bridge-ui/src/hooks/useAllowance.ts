import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import useSWR from 'swr'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

import { useNetworksAndSigners } from './useNetworksAndSigners'
import {
  getL2ERC20Address,
  getL2GatewayAddress,
  getL1TokenAllowance
} from '../util/TokenUtils'

export const useAllowance = (erc20L1Address: string | undefined) => {
  const {
    l1: { provider: l1Provider },
    l2: { provider: l2Provider }
  } = useNetworksAndSigners()
  const { address } = useAccount()

  const [erc20L2Address, setErc20L2Address] = useState<string | undefined>()

  useEffect(() => {
    async function updateErc20L2Address() {
      setErc20L2Address(
        erc20L1Address
          ? await getL2ERC20Address({
              erc20L1Address,
              l1Provider,
              l2Provider
            })
          : undefined
      )
    }
    updateErc20L2Address()
  }, [erc20L1Address, l1Provider, l2Provider])

  // Query keys

  const isValidQueryKey = !!(
    address &&
    erc20L1Address &&
    l1Provider &&
    l2Provider
  )

  const queryKeyL1 = useMemo(() => {
    if (!isValidQueryKey) {
      // don't fetch
      return undefined
    }
    return 'allowanceL1'
  }, [isValidQueryKey])

  const queryKeyL2 = useMemo(async () => {
    if (!isValidQueryKey || !erc20L2Address) {
      // don't fetch
      return undefined
    }
    return 'allowanceL2'
  }, [isValidQueryKey, erc20L2Address])

  // Fetch L1

  const fetchAllowanceL1 = useCallback(() => {
    if (!isValidQueryKey) {
      return undefined
    }
    return getL1TokenAllowance({
      account: address,
      erc20L1Address,
      l1Provider,
      l2Provider
    })
  }, [isValidQueryKey, address, erc20L1Address, l1Provider, l2Provider])

  const { data: allowanceL1, mutate: mutateL1 } = useSWR(
    queryKeyL1,
    fetchAllowanceL1,
    {
      refreshInterval: 5_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  const updateAllowanceL1 = useCallback(async () => {
    return mutateL1(await fetchAllowanceL1(), {
      populateCache(result, currentData) {
        return {
          ...currentData,
          ...result
        }
      },
      revalidate: false
    })
  }, [fetchAllowanceL1, mutateL1])

  // Fetch L2

  const fetchAllowanceL2 = useCallback(async () => {
    if (!isValidQueryKey || !erc20L2Address) {
      return undefined
    }
    const token = ERC20__factory.connect(erc20L2Address, l2Provider)
    const gatewayAddress = await getL2GatewayAddress({
      erc20L1Address,
      l2Provider
    })
    return token.allowance(address, gatewayAddress)
  }, [address, erc20L1Address, erc20L2Address, isValidQueryKey, l2Provider])

  const { data: allowanceL2, mutate: mutateL2 } = useSWR(
    queryKeyL2,
    fetchAllowanceL2,
    {
      refreshInterval: 5_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  const updateAllowanceL2 = useCallback(async () => {
    return mutateL2(await fetchAllowanceL2(), {
      populateCache(result, currentData) {
        return {
          ...currentData,
          ...result
        }
      },
      revalidate: false
    })
  }, [fetchAllowanceL2, mutateL2])

  return {
    allowanceL1,
    allowanceL2,
    updateAllowanceL1,
    updateAllowanceL2
  }
}
