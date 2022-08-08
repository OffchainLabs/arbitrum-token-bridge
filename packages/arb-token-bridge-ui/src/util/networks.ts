import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'
import { convertNetworkNitroToClassic } from '@arbitrum/sdk/dist/lib/utils/migration_types'

import * as ClassicNetworks from '@arbitrum/sdk-classic/dist/lib/dataEntities/networks'
import * as NitroNetworks from '@arbitrum/sdk-nitro/dist/lib/dataEntities/networks'

NitroNetworks.l1Networks[1].partnerChainIDs.push(42170)
ClassicNetworks.l1Networks[1].partnerChainIDs.push(42170)

ClassicNetworks.l1Networks[5] = NitroNetworks.l1Networks[5]

ClassicNetworks.l2Networks[421613] = convertNetworkNitroToClassic(
  NitroNetworks.l2Networks[421613]
)
ClassicNetworks.l2Networks[42170] = convertNetworkNitroToClassic(
  NitroNetworks.l2Networks[42170]
)
const INFURA_KEY = process.env.REACT_APP_INFURA_KEY as string

if (!INFURA_KEY) {
  throw new Error('Infura API key not provided')
}

export const rpcURLs: { [chainId: number]: string } = {
  1: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  4: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  5: `https://goerli.infura.io/v3/${INFURA_KEY}`,
  42161: 'https://arb1.arbitrum.io/rpc',
  421611: 'https://rinkeby.arbitrum.io/rpc',
  42170: 'https://a4ba.arbitrum.io/rpc',
  421613: 'https://goerli-rollup.arbitrum.io/rpc'
}

NitroNetworks.l1Networks[1].rpcURL = rpcURLs[1]
NitroNetworks.l1Networks[4].rpcURL = rpcURLs[4]
NitroNetworks.l1Networks[5].rpcURL = rpcURLs[5]

export const l2DaiGatewayAddresses: { [chainId: number]: string } = {
  42161: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  421611: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65'
}

export function registerLocalNetwork() {
  let localNetwork: {
    l1Network: L1Network
    l2Network: L2Network
  }

  try {
    // Generate the "localNetwork.json" file by running "yarn gen:network" in @arbitrum/sdk and then copy it over.
    localNetwork = require('./localNetwork.json')
  } catch (error) {
    return console.warn(
      `Skipping local network registration as no "localNetwork.json" file was found.`
    )
  }

  try {
    const customL1Network = localNetwork.l1Network
    const customL2Network = localNetwork.l2Network

    rpcURLs[customL1Network.chainID] = customL1Network.rpcURL
    rpcURLs[customL2Network.chainID] = customL2Network.rpcURL

    addCustomNetwork({ customL1Network, customL2Network })
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

export function isNetwork(network: L1Network | L2Network) {
  const chainId = network.chainID

  return {
    // L1
    isMainnet: chainId === 1,
    // L1 Testnets
    isRinkeby: chainId === 4,
    isGoerli: chainId === 5,
    // L2
    isArbitrum: Boolean((network as any).isArbitrum),
    isArbitrumOne: chainId === 42161,
    isArbitrumNova: chainId === 42170,
    // L2 Testnets
    isArbitrumRinkeby: chainId === 421611,
    isArbitrumGoerliRollup: chainId === 421613
  }
}
