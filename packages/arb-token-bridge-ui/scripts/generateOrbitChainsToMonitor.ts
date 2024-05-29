import fs from 'fs'
import { getOrbitChains } from '../src/util/orbitChainsList'
import { L2Network } from '@arbitrum/sdk'
import { getExplorerUrl, rpcURLs } from '../src/util/networks'

interface ChildNetwork extends L2Network {
  parentRpcUrl: string
  orbitRpcUrl: string
  parentExplorerUrl: string
}

const sanitizeExplorerUrl = (url: string) => {
  // we want explorer urls to have a trailing slash
  if (url.endsWith('/')) {
    return url
  } else {
    return url + '/'
  }
}

const sanitizeRpcUrl = (url: string) => {
  // we want rpc urls to NOT have a trailing slash
  if (url.endsWith('/')) {
    return url.slice(0, -1)
  } else {
    return url
  }
}

async function generateOrbitChainsToMonitor() {
  const orbitChains = await getOrbitChains()

  const orbitChainsToMonitor: ChildNetwork[] = orbitChains.map(orbitChain => ({
    ...orbitChain,
    explorerUrl: sanitizeExplorerUrl(orbitChain.explorerUrl),
    orbitRpcUrl: sanitizeRpcUrl(orbitChain.rpcUrl),
    parentRpcUrl: sanitizeRpcUrl(rpcURLs[orbitChain.partnerChainID]),
    parentExplorerUrl: sanitizeExplorerUrl(
      getExplorerUrl(orbitChain.partnerChainID)
    )
  }))

  fs.writeFileSync(
    'orbit-chains.json',
    JSON.stringify(
      {
        childChains: [orbitChainsToMonitor]
      },
      null,
      2
    )
  )
}

generateOrbitChainsToMonitor()
