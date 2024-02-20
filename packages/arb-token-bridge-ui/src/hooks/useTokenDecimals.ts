import { useMemo } from 'react'
import { defaultErc20Decimals } from '../defaults'
import { useTokens } from '../features/tokenLists/hooks/useTokens'
import { useNetworks } from './useNetworks'

const useTokenDecimals = (tokenAddress: string | null) => {
  const [networks] = useNetworks()
  const { sourceTokens } = useTokens({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })

  return useMemo(() => {
    if (!tokenAddress) {
      return defaultErc20Decimals
    }

    return sourceTokens[tokenAddress]?.decimals ?? defaultErc20Decimals
  }, [sourceTokens, tokenAddress])
}

export { useTokenDecimals }
