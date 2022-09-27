import { JsonRpcProvider } from '@ethersproject/providers'
import { useBalanceContext } from '../context/balanceContext'
import useSWR from 'swr'

const useBalance = ({
  provider,
  walletAddress
}: {
  provider: JsonRpcProvider
  walletAddress: string | undefined
}) => {
  const [allBalances, setBalances] = useBalanceContext()
  let balances
  // While refreshing the page, provider.network is undefined, so chainId might be undefined
  if (walletAddress && provider.network?.chainId) {
    balances = allBalances[walletAddress]?.[provider.network.chainId]
  }
  balances = balances || { eth: null }

  const { mutate } = useSWR(
    [walletAddress, provider.network?.chainId],
    async (walletAddress, chainId) => {
      if (!walletAddress || !chainId) {
        return
      }

      try {
        const newBalance = await provider.getBalance(walletAddress)

        setBalances({
          walletAddress,
          chainId,
          type: 'eth',
          balance: newBalance
        })
      } catch (error) {
        // Do nothing, balances is kept to previous state
      }
    },
    {
      refreshInterval: 5000,
      shouldRetryOnError: false
    }
  )

  return {
    eth: [balances.eth, mutate] as const
  }
}

export { useBalance }
