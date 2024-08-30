import fs from 'fs'
import 'dotenv/config'
import { getArbitrumNetwork } from '@arbitrum/sdk'
import { ChainId, rpcURLs } from '../src/util/networks'
import { getChainToMonitor } from './utils'

// github secrets return '' for empty values, so we need to sanitize the value
const sanitizeEnvValue = (envValue: any) => {
  return typeof envValue === 'string' && envValue !== '' ? envValue : undefined
}

async function generateCoreChainsToMonitor() {
  const novaChain = {
    ...getArbitrumNetwork(ChainId.ArbitrumNova),
    rpcURL:
      sanitizeEnvValue(process.env.NOVA_MONITOR_RPC_URL) ??
      rpcURLs[ChainId.ArbitrumNova]
  }
  const arbOneChain = {
    ...getArbitrumNetwork(ChainId.ArbitrumOne),
    rpcURL:
      sanitizeEnvValue(process.env.ARB_ONE_MONITOR_RPC_URL) ??
      rpcURLs[ChainId.ArbitrumOne]
  }

  // don't need to monitor arbOne chain in case of retryable-monitoring
  const chains =
    process.env.INCLUDE_ARB_ONE_AS_CORE_CHAIN === 'true'
      ? [arbOneChain, novaChain]
      : [novaChain]

  // make the chain data compatible with that required by the monitoring script
  const coreChainsToMonitor = chains.map(coreChain =>
    getChainToMonitor({
      chain: coreChain,
      rpcUrl: coreChain.rpcURL
    })
  )

  // write to orbit-chains.json, we will use this json as an input to the monitoring script
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
