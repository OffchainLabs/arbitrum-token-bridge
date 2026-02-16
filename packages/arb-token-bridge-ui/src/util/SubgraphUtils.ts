import { ChainId } from '../types/ChainId'
import { getAPIBaseUrl } from '.'

export function hasL1Subgraph(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
    case ChainId.ArbitrumNova:
    case ChainId.ArbitrumSepolia:
      return true

    default:
      return false
  }
}

export function hasL2Subgraph(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
    case ChainId.ArbitrumNova:
    case ChainId.ArbitrumSepolia:
      return true

    default:
      return false
  }
}

export function hasTeleporterSubgraph(l1ChainId: number) {
  switch (l1ChainId) {
    case ChainId.Ethereum:
    case ChainId.Sepolia:
      return true

    default:
      return false
  }
}

export const fetchLatestSubgraphBlockNumber = async (
  chainId: number
): Promise<number> => {
  try {
    const response = await fetch(
      `${getAPIBaseUrl()}/api/chains/${chainId}/block-number`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    )

    console.log({ response })
  
    return ((await response.json()) as { data: number }).data
  } catch {
    return 0
  }
}

export const shouldIncludeSentTxs = ({
  type,
  isSmartContractWallet,
  isConnectedToParentChain
}: {
  type: 'deposits' | 'withdrawals'
  isSmartContractWallet: boolean
  isConnectedToParentChain: boolean
}) => {
  if (isSmartContractWallet) {
    // show txs sent from this account for:
    // 1. deposits if we are connected to the parent chain, or
    // 2. withdrawals if we are connected to the child chain
    return isConnectedToParentChain
      ? type === 'deposits'
      : type === 'withdrawals'
  }
  // always show for EOA
  return true
}

export const shouldIncludeReceivedTxs = ({
  type,
  isSmartContractWallet,
  isConnectedToParentChain
}: {
  type: 'deposits' | 'withdrawals'
  isSmartContractWallet: boolean
  isConnectedToParentChain: boolean
}) => {
  if (isSmartContractWallet) {
    // show txs sent to this account for:
    // 1. withdrawals if we are connected to the parent chain, or
    // 2. deposits if we are connected to the child chain
    return isConnectedToParentChain
      ? type === 'withdrawals'
      : type === 'deposits'
  }
  // always show for EOA
  return true
}
