import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'

import { orbitMainnets } from '../orbitChainsList'

export function registerOrbitMainnetChain(chainId: number) {
  const orbitChain = orbitMainnets[chainId]

  if (!orbitChain) {
    throw new Error(`Could not find chain ${chainId} in the Orbit chains list.`)
  }

  registerCustomArbitrumNetwork(orbitChain)
}
