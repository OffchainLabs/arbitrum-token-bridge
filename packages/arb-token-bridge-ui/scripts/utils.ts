import { ArbitrumNetwork } from '@arbitrum/sdk'

import { getExplorerUrl, rpcURLs } from '../src/util/networks'
import { OrbitChainConfig } from '../src/util/orbitChainsList'

export interface ChainToMonitor extends ArbitrumNetwork {
  parentRpcUrl: string
  orbitRpcUrl: string
  explorerUrl: string
  parentExplorerUrl: string
}

export const sanitizeExplorerUrl = (url: string) => {
  // we want explorer urls to have a trailing slash
  if (url.endsWith('/')) {
    return url
  } else {
    return url + '/'
  }
}

export const sanitizeRpcUrl = (url: string) => {
  // we want rpc urls to NOT have a trailing slash
  if (url.endsWith('/')) {
    return url.slice(0, -1)
  } else {
    return url
  }
}

const hasExplorerUrl = (
  chain: ArbitrumNetwork | OrbitChainConfig
): chain is OrbitChainConfig => {
  return typeof (chain as OrbitChainConfig).explorerUrl !== 'undefined'
}

// make the chain data compatible with that required by the retryable-monitoring script
// TODO: in a later refactor, we will update the term `orbitRpcUrl` to chain-agnostic, `rpcUrl`
export const getChainToMonitor = ({
  chain,
  rpcUrl
}: {
  chain: ArbitrumNetwork | OrbitChainConfig
  rpcUrl: string
}): ChainToMonitor => ({
  ...chain,
  explorerUrl: sanitizeExplorerUrl(
    hasExplorerUrl(chain) ? chain.explorerUrl : getExplorerUrl(chain.chainId)
  ),
  orbitRpcUrl: sanitizeRpcUrl(rpcUrl),
  parentRpcUrl: sanitizeRpcUrl(rpcURLs[chain.parentChainId]),
  parentExplorerUrl: sanitizeExplorerUrl(getExplorerUrl(chain.parentChainId))
})
