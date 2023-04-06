import { useMemo } from 'react'
import { ArbTokenBridge } from '../token-bridge-sdk'

const useTokenDecimals = (
  bridgeTokens: ArbTokenBridge['bridgeTokens'],
  tokenAddress: string | null
) => {
  return useMemo(() => {
    if (typeof bridgeTokens === 'undefined') {
      return 18
    }

    if (!tokenAddress) {
      return 18
    }

    return bridgeTokens[tokenAddress]?.decimals ?? 18
  }, [bridgeTokens, tokenAddress])
}

export { useTokenDecimals }
