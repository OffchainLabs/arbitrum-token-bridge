import fs from 'fs'
import { getOrbitChains } from '../src/util/orbitChainsList'
import { getChainToMonitor } from './utils'

async function generateOrbitChainsToMonitor() {
  const orbitChains = getOrbitChains({ mainnet: true, testnet: false })

  // make the orbit chain data compatible with the orbit-data required by the retryable-monitoring script
  const orbitChainsToMonitor = orbitChains.map(orbitChain => {
    return getChainToMonitor({
      chain: orbitChain,
      rpcUrl: orbitChain.rpcUrl
    })
  })

  // Ensure the public directory exists
  const publicDir = './public'
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  // write to orbit-chains.json, we will use this json as an input to the retryable-monitoring script
  const resultsJson = JSON.stringify(
    {
      childChains: orbitChainsToMonitor
    },
    null,
    2
  )
  fs.writeFileSync('./public/__auto-generated-orbit-chains.json', resultsJson)
}

generateOrbitChainsToMonitor()
