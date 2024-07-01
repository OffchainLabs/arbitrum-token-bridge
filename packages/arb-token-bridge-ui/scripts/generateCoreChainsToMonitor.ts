import fs from 'fs'
import { getL2Network } from '@arbitrum/sdk'
import { ChainId, rpcURLs } from '../src/util/networks'
import { getChainToMonitor } from './utils'

async function generateCoreChainsToMonitor() {
  const novaChain = await getL2Network(ChainId.ArbitrumNova)

  // make the chain data compatible with that required by the retryable-monitoring script
  const coreChainsToMonitor = [novaChain].map(coreChain =>
    getChainToMonitor({
      chain: coreChain,
      rpcUrl: process.env.NOVA_MONITOR_RPC_URL ?? rpcURLs[novaChain.chainID]
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
