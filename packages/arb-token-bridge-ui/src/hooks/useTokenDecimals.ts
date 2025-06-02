import { useMemo } from 'react'

import { defaultErc20Decimals } from '../defaults'
import { ArbTokenBridge } from './arbTokenBridge.types'

const useTokenDecimals = (
  bridgeTokens: ArbTokenBridge['bridgeTokens'],
  tokenAddress: string | null
) => {
  return useMemo(() => {
    if (typeof bridgeTokens === 'undefined') {
      return defaultErc20Decimals
    }

    if (!tokenAddress) {
      return defaultErc20Decimals
    }

    return bridgeTokens[tokenAddress]?.decimals ?? defaultErc20Decimals
  }, [bridgeTokens, tokenAddress])
}

export { useTokenDecimals }
