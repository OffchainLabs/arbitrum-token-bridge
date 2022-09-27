import { JsonRpcProvider } from '@ethersproject/providers'
import { useBalanceContext } from '../context/balanceContext'
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
    eth: null
  }

  const { mutate } = useSWR(
    [walletAddress, provider.network?.chainId],
    async (walletAddress, chainId) => {
      if (!walletAddress) {
        return
      }
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
    eth: [balances.eth, mutate] as const
  }
}

export { useBalance }
