import { useMemo } from 'react'
import { BigNumber, utils } from 'ethers'

import { useAppState } from '../../state'

export function calculateEstimatedL1GasFees(
  estimatedL1Gas: BigNumber,
  l1GasPrice: BigNumber
) {
  return parseFloat(utils.formatEther(estimatedL1Gas.mul(l1GasPrice)))
}

export function calculateEstimatedL2GasFees(
  estimatedL2Gas: BigNumber,
  l2GasPrice: BigNumber,
  estimatedL2SubmissionCost: BigNumber
) {
  return parseFloat(
    utils.formatEther(
      estimatedL2Gas.mul(l2GasPrice).add(estimatedL2SubmissionCost)
    )
  )
}

// TODO: These could be useful in the rest of the app

export type Balances = {
  ethereum: BigNumber | null
  arbitrum: BigNumber | null
}

export function useETHBalances(): Balances {
  const { app } = useAppState()
  const { arbTokenBridge } = app

  return useMemo(() => {
    if (!arbTokenBridge || !arbTokenBridge.balances) {
      return { ethereum: null, arbitrum: null }
    }

    return {
      ethereum: arbTokenBridge.balances.eth.balance,
      arbitrum: arbTokenBridge.balances.eth.arbChainBalance
    }
  }, [arbTokenBridge])
}

export function useTokenBalances(erc20L1Address?: string): Balances {
  const { app } = useAppState()
  const { arbTokenBridge } = app

  return useMemo(() => {
    const defaultResult = { ethereum: null, arbitrum: null }

    if (typeof erc20L1Address === 'undefined') {
      return defaultResult
    }

    if (!arbTokenBridge || !arbTokenBridge.balances) {
      return defaultResult
    }

    const tokenBalances = arbTokenBridge.balances.erc20[erc20L1Address]

    if (typeof tokenBalances === 'undefined') {
      return defaultResult
    }

    return {
      ethereum: tokenBalances.balance,
      arbitrum: tokenBalances.arbChainBalance
    }
  }, [arbTokenBridge, erc20L1Address])
}
