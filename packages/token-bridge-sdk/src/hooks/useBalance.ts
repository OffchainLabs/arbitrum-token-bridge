import { useCallback } from 'react'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useBalanceContext } from '../context/balanceContext'
import { BigNumber } from 'ethers'

const useBalance = ({
  provider,
  walletAddress
}: {
  provider: JsonRpcProvider
  walletAddress: string
}) => {
  const [balances, setBalances] = useBalanceContext()
  const balance =
    balances[walletAddress]?.[provider.network?.chainId] ?? BigNumber.from(0)

  const updateBalance = useCallback(async () => {
    const newBalance = await provider.getBalance(walletAddress)
    setBalances({
      walletAddress,
      balance: { [provider.network.chainId]: newBalance }
    })
  }, [walletAddress, setBalances, provider])

  return [balance, updateBalance] as const
}

export { useBalance }
