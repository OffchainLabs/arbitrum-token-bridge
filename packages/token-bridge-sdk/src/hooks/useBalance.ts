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

  if (typeof walletAddress !== 'undefined' && typeof chainId !== 'undefined') {
    safeBalance = balances[walletAddress]?.[chainId] ?? defaultBalance
  }

  const queryKey = useMemo(() => {
    if (
      typeof chainId === 'undefined' ||
      typeof walletAddress === 'undefined'
    ) {
      // Don't fetch
      return null
    }

    return ['ethBalance', chainId, walletAddress.toLowerCase()]
  }, [chainId, walletAddress])

  const { mutate } = useSWR(
    queryKey,
    async (_, _chainId: number, _walletAddress: string) => {
      const newBalance = await provider.getBalance(_walletAddress)

      setBalances({
        walletAddress: _walletAddress,
        chainId: _chainId,
        type: 'eth',
        balance: newBalance
      })
    },
    {
      refreshInterval: 5_000,
      shouldRetryOnError: true,
      errorRetryCount: 1,
      errorRetryInterval: 1_000
    }
  )

  return {
    eth: [safeBalance.eth, mutate] as const
  }
}

export { useBalance }
