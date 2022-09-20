import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { BigNumber, utils } from 'ethers'

import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useBalance } from 'token-bridge-sdk'

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

export function useIsSwitchingL2Chain() {
  const { app } = useAppState()
  const { isDepositMode } = app

  const { l2, isConnectedToArbitrum } = useNetworksAndSigners()

  const { search } = useLocation()
  const searchParams = new URLSearchParams(search)
  const l2ChainIdSearchParam = searchParams.get('l2ChainId')

  return useMemo(() => {
    if (isConnectedToArbitrum || !isDepositMode) {
      return false
    }

    const parsedL2ChainId = parseInt(l2ChainIdSearchParam || '')

    if (isNaN(parsedL2ChainId)) {
      return false
    }

    return l2.network.chainID !== parsedL2ChainId
  }, [isConnectedToArbitrum, isDepositMode, l2, l2ChainIdSearchParam])
}
