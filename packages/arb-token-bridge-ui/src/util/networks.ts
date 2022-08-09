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

export enum ChainId {
  Mainnet = 1,
  Rinkeby = 4,
  Goerli = 5,
  ArbitrumOne = 42161,
  ArbitrumNova = 42170,
  ArbitrumRinkeby = 421611,
  ArbitrumGoerli = 421613
}

export const rpcURLs: { [chainId: number]: string } = {
  // L1
  [ChainId.Mainnet]: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  // L1 Testnets
  [ChainId.Rinkeby]: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  [ChainId.Goerli]: `https://goerli.infura.io/v3/${INFURA_KEY}`,
  // L2
  [ChainId.ArbitrumOne]: 'https://arb1.arbitrum.io/rpc',
  [ChainId.ArbitrumNova]: 'https://a4ba.arbitrum.io/rpc',
  // L2 Testnets
  [ChainId.ArbitrumRinkeby]: 'https://rinkeby.arbitrum.io/rpc',
  [ChainId.ArbitrumGoerli]: 'https://goerli-rollup.arbitrum.io/rpc'
}

NitroNetworks.l1Networks[1].rpcURL = rpcURLs[1]
NitroNetworks.l1Networks[4].rpcURL = rpcURLs[4]
NitroNetworks.l1Networks[5].rpcURL = rpcURLs[5]

export const l2DaiGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  [ChainId.ArbitrumRinkeby]: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65'
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
    isMainnet: chainId === ChainId.Mainnet,
    // L1 Testnets
    isRinkeby: chainId === ChainId.Rinkeby,
    isGoerli: chainId === ChainId.Goerli,
    // L2
    isArbitrum: Boolean((network as any).isArbitrum),
    isArbitrumOne: chainId === ChainId.ArbitrumOne,
    isArbitrumNova: chainId === ChainId.ArbitrumNova,
    // L2 Testnets
    isArbitrumRinkeby: chainId === ChainId.ArbitrumRinkeby,
    isArbitrumGoerliRollup: chainId === ChainId.ArbitrumGoerli
  }
}
