import { useMemo } from 'react'
import { BigNumber, constants } from 'ethers'

import { useBalance } from 'token-bridge-sdk'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'

export enum NetworkType {
  l1 = 'l1',
  l2 = 'l2'
}
export type Balances = {
  [NetworkType.l1]: BigNumber | null
  [NetworkType.l2]: BigNumber | null
}
export function useTokenBalances(erc20L1Address?: string): Balances {
  const {
    app: {
      arbTokenBridge: { walletAddress, bridgeTokens }
    }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()
  const {
    erc20: [erc20L1Balances]
  } = useBalance({ provider: l1.provider, walletAddress })
  const {
    erc20: [erc20L2Balances]
  } = useBalance({ provider: l2.provider, walletAddress })

  return useMemo(() => {
    const defaultResult = { [NetworkType.l1]: null, [NetworkType.l2]: null }

    if (typeof erc20L1Address === 'undefined') {
      return defaultResult
    }

    // bridgeTokens is undefined when switching network or during initialisation of the app
    if (typeof bridgeTokens === 'undefined') {
      return defaultResult
    }

    const erc20L2Address = bridgeTokens[erc20L1Address.toLowerCase()]?.l2Address
    const l2Balance =
      erc20L2Balances?.[(erc20L2Address || '').toLowerCase()] || null

    return {
      [NetworkType.l1]: erc20L1Balances?.[erc20L1Address.toLowerCase()] || null,
      [NetworkType.l2]: erc20L2Address ? l2Balance : constants.Zero // If l2Address doesn't exist, default balance to zero
    }
  }, [erc20L1Balances, erc20L2Balances, erc20L1Address, bridgeTokens])
}
