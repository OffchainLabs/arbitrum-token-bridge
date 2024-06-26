import { L2Network } from '@arbitrum/sdk'
import { OrbitChainConfig } from '../src/util/orbitChainsList'
import { getExplorerUrl, rpcURLs } from '../src/util/networks'

export interface ChainToMonitor extends L2Network {
  parentRpcUrl: string
  orbitRpcUrl: string
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

// make the chain data compatible with that required by the retryable-monitoring script
// TODO: in a later refactor, we will update the term `orbitRpcUrl` to chain-agnostic, `rpcUrl`
export const getChainToMonitor = ({
  chain,
  rpcUrl
}: {
  chain: L2Network | OrbitChainConfig
  rpcUrl: string
}): ChainToMonitor => ({
  ...chain,
  explorerUrl: sanitizeExplorerUrl(chain.explorerUrl),
  orbitRpcUrl: sanitizeRpcUrl(rpcUrl),
  parentRpcUrl: sanitizeRpcUrl(rpcURLs[chain.partnerChainID]),
  parentExplorerUrl: sanitizeExplorerUrl(getExplorerUrl(chain.partnerChainID))
})
