import { useCallback } from 'react'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useBalanceContext } from '../context/balanceContext'

const useBalance = ({
  provider,
  walletAddress
}: {
  provider: JsonRpcProvider
  walletAddress: string
}) => {
  const [balances, setBalances] = useBalanceContext()
  const balance = balances[walletAddress]?.[provider.network.chainId] ?? null

  const updateBalance = useCallback(async () => {
    const newBalance = await provider.getBalance(walletAddress)

    setBalances({
      walletAddress: walletAddress,
      balance: { [provider.network.chainId]: newBalance }
    })
  }, [provider, setBalances, walletAddress])

  return [balance, updateBalance] as const
}

export { useBalance }
