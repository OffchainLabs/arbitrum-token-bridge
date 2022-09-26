import { useCallback } from 'react'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useBalanceContext } from '../context/balanceContext'
import { BigNumber } from 'ethers'
import useSWR from 'swr'

const useBalance = ({
  provider,
  walletAddress
}: {
  provider: JsonRpcProvider
  walletAddress: string
}) => {
  const [allBalances, setBalances] = useBalanceContext()
  const balances = allBalances[walletAddress]?.[provider.network?.chainId] || {
    eth: BigNumber.from(0)
  }

  const { mutate } = useSWR(
    walletAddress && provider.network?.chainId
      ? [walletAddress, provider.network.chainId]
      : null,
    async (walletAddress, chainId) => {
      const newBalance = await provider.getBalance(walletAddress)
      setBalances({
        walletAddress,
        chainId,
        type: 'eth',
        balance: newBalance
      })
    },
    {
      refreshInterval: 5000
    }
  )

  return {
    eth: [balances.eth ?? BigNumber.from(0), mutate] as const
  }
}

export { useBalance }
