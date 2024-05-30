import fs from 'fs'
import { L2Network } from '@arbitrum/sdk'
import { getOrbitChains } from '../src/util/orbitChainsList'
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

  // make the orbit chain data compatible with the orbit-data required by the retryable-monitoring script
  const orbitChainsToMonitor: ChildNetwork[] = orbitChains.map(orbitChain => ({
    ...orbitChain,
    explorerUrl: sanitizeExplorerUrl(orbitChain.explorerUrl),
    orbitRpcUrl: sanitizeRpcUrl(orbitChain.rpcUrl),
    parentRpcUrl: sanitizeRpcUrl(rpcURLs[orbitChain.partnerChainID]),
    parentExplorerUrl: sanitizeExplorerUrl(
      getExplorerUrl(orbitChain.partnerChainID)
    )
  }))

  // write to orbit-chains.json, we will use this json as an input to the retryable-monitoring script
  const resultsJson = JSON.stringify(
    {
      childChains: [orbitChainsToMonitor]
    },
    null,
    2
  )
  fs.writeFileSync('./public/__auto-generated-orbit-chains.json', resultsJson)
}

generateOrbitChainsToMonitor()
//3
