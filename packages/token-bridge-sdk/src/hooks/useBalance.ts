import { useMemo } from 'react'
import { BigNumber, providers } from 'ethers'
import useSWR from 'swr'

import { useChainId } from './useChainId'
import { useBalanceContext } from '../context/balanceContext'

const defaultBalance = {
  eth: null
}

const useBalance = ({
  provider,
  walletAddress
}: {
  provider: providers.Provider
  walletAddress: string | undefined
}) => {
  const chainId = useChainId({ provider })
  const [balances, setBalances] = useBalanceContext()

  let safeBalance: { eth: BigNumber | null } = defaultBalance

  const walletAddressLowercased = useMemo(
    () => walletAddress?.toLowerCase(),
    [walletAddress]
  )

  const queryKey = useMemo(() => {
    if (
      typeof chainId === 'undefined' ||
      typeof walletAddressLowercased === 'undefined'
    ) {
      // Don't fetch
      return null
    }

    return ['ethBalance', chainId, walletAddressLowercased]
  }, [chainId, walletAddressLowercased])

  if (
    typeof walletAddressLowercased !== 'undefined' &&
    typeof chainId !== 'undefined'
  ) {
    safeBalance = balances[walletAddressLowercased]?.[chainId] ?? defaultBalance
  }

  const { mutate } = useSWR(
    queryKey,
    async (_, _chainId: number, _walletAddress: string) => {
      setBalances({
        walletAddress: _walletAddress,
        chainId: _chainId,
        type: 'eth',
        balance: await provider.getBalance(_walletAddress)
      })
    },
    {
      refreshInterval: 15_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )

  return {
    eth: [safeBalance.eth, mutate] as const
  }
}

export { useBalance }
