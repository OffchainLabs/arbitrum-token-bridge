import fs from 'fs'
import { getL1Network } from '@arbitrum/sdk'
import { ARB_MINIMUM_BLOCK_TIME_IN_SECONDS } from '@arbitrum/sdk/dist/lib/dataEntities/constants'
import { getOrbitChains } from '../src/util/orbitChainsList'
import { getChainToMonitor } from './utils'
import { ChainId } from '../src/util/networks'

async function generateOrbitChainsToMonitor() {
  const orbitChains = await getOrbitChains({ mainnet: true, testnet: false })
  const ethChain = await getL1Network(ChainId.Ethereum)

  // make the orbit chain data compatible with the orbit-data required by the retryable-monitoring script
  const orbitChainsToMonitor = orbitChains.map(orbitChain => {
    const parentChainId = orbitChain.partnerChainID // block-time will vary depending on if parent-chain is L1 or L2

    return getChainToMonitor({
      chain: orbitChain,
      rpcUrl: orbitChain.rpcUrl,
      parentBlockTime:
        parentChainId === ChainId.Ethereum
          ? ethChain.blockTime
          : ARB_MINIMUM_BLOCK_TIME_IN_SECONDS
    })
  })

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
