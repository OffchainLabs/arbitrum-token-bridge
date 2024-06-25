import fs from 'fs'
import { getL1Network, getL2Network } from '@arbitrum/sdk'
import { ChainId, rpcURLs } from '../src/util/networks'
import { getChainToMonitor } from './utils'

async function generateCoreChainsToMonitor() {
  const ethChain = await getL1Network(ChainId.Ethereum)
  const novaChain = await getL2Network(ChainId.ArbitrumNova)

  // make the chain data compatible with that required by the retryable-monitoring script
  const coreChainsToMonitor = [novaChain].map(coreChain =>
    getChainToMonitor({
      chain: coreChain,
      rpcUrl: rpcURLs[coreChain.chainID],
      parentBlockTime: ethChain.blockTime
    })
  )

  // write to orbit-chains.json, we will use this json as an input to the retryable-monitoring script
  const resultsJson = JSON.stringify(
    {
      childChains: coreChainsToMonitor
    },
    null,
    2
  )
  fs.writeFileSync('./public/__auto-generated-core-chains.json', resultsJson)
}

generateCoreChainsToMonitor()
