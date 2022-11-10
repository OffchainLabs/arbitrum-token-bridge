import { useMemo } from 'react'
import { BigNumber, constants } from 'ethers'

import { useBalance } from 'token-bridge-sdk'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { useAppState } from '../state'

export type Balances = {
  l1: BigNumber | null
  l2: BigNumber | null
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
    const defaultResult = { l1: null, l2: null }

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
      l1: erc20L1Balances?.[erc20L1Address.toLowerCase()] || null,
      l2: erc20L2Address ? l2Balance : constants.Zero // If l2Address doesn't exist, default balance to zero
    }
  }, [erc20L1Balances, erc20L2Balances, erc20L1Address, bridgeTokens])
}
