import { L1Network, L2Network, addCustomNetwork, isNitroL2 } from '@arbitrum/sdk'
import * as NitroNetworks from '@arbitrum/sdk-nitro/dist/lib/dataEntities/networks'
import {
  getL2Network as nitroGetL2Network,
  getL1Network as nitroGetL1Network,
} from '@arbitrum/sdk-nitro/dist/lib/dataEntities/networks'
import { JsonRpcProvider, Provider } from '@ethersproject/providers'


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
  ArbitrumGoerli = 421613,
  L1ShadowFork = 1337,
  L2ShadowFork = 412346
}

export const rpcURLs: { [chainId: number]: string } = {
  // L1
  [ChainId.Mainnet]: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  // L1 Testnets
  [ChainId.Rinkeby]: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  [ChainId.Goerli]: `https://goerli.infura.io/v3/${INFURA_KEY}`,
  // L2
  [ChainId.ArbitrumOne]: 'https://arb1.arbitrum.io/rpc',
  [ChainId.ArbitrumNova]: 'https://nova.arbitrum.io/rpc',
  // L2 Testnets
  [ChainId.ArbitrumRinkeby]: 'https://rinkeby.arbitrum.io/rpc',
  [ChainId.ArbitrumGoerli]: 'https://goerli-rollup.arbitrum.io/rpc',
  // shadow fork
  [ChainId.L1ShadowFork]: 'https://arb1-shadowfork.arbitrum.io/l1',
  [ChainId.L2ShadowFork]: 'https://arb1-shadowfork.arbitrum.io/l2',
}

const inferShadowNetworks = async (
  l1Provider: Provider,
  l2Provider: Provider
) => {
  const mainnetL2 = await nitroGetL2Network(42161)
  let l2Network: L2Network
  if ((await l1Provider.getCode(mainnetL2.ethBridge.inbox)).length > 2) {
    l2Network = mainnetL2
  } else throw new Error('Could not infer shadow networks.')

  const l1Network = await nitroGetL1Network(l2Network.partnerChainID)
  const copiedNetworks: { l1Network: L1Network; l2Network: L2Network } = {
    l1Network: { ...l1Network },
    l2Network: { ...l2Network },
  }

  const l2ChainId = (await l2Provider.getNetwork()).chainId
  copiedNetworks.l2Network.chainID = l2ChainId
  copiedNetworks.l2Network.isCustom = true
  const l1ChainID = (await l1Provider.getNetwork()).chainId
  copiedNetworks.l2Network.partnerChainID = l1ChainID
  copiedNetworks.l2Network.rpcURL = rpcURLs[l2ChainId]
  copiedNetworks.l1Network.rpcURL = rpcURLs[l1ChainID]
  copiedNetworks.l1Network.chainID = l1ChainID
  copiedNetworks.l1Network.isCustom = true
  copiedNetworks.l1Network.partnerChainIDs = [l2ChainId]

  return { ...copiedNetworks }
}

export async function addShadowFork() {
  const ethProvider = new JsonRpcProvider(rpcURLs[ChainId.L1ShadowFork])
  const arbProvider = new JsonRpcProvider(rpcURLs[ChainId.L2ShadowFork])

  const networks = await inferShadowNetworks(ethProvider, arbProvider)

  addCustomNetwork({
    customL1Network: networks.l1Network,
    customL2Network: networks.l2Network,
  })
  NitroNetworks.l1Networks[ChainId.L1ShadowFork].rpcURL = rpcURLs[ChainId.L1ShadowFork]
  // this triggers `generateL2NitroNetwork` inside the sdk to update the addresses to the new nitro deployments
  const isNitro = await isNitroL2(arbProvider)
  return isNitro
}

NitroNetworks.l1Networks[1].rpcURL = rpcURLs[1]
NitroNetworks.l1Networks[4].rpcURL = rpcURLs[4]
NitroNetworks.l1Networks[5].rpcURL = rpcURLs[5]

export const l2DaiGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  [ChainId.ArbitrumNova]: '0x10E6593CDda8c58a1d0f14C5164B376352a55f2F',
  [ChainId.ArbitrumRinkeby]: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65'
}

export const l2wstETHGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumRinkeby]: '0x65321bf24210b81500230dcece14faa70a9f50a7'
}

// Default L2 Chain to use for a certain chainId
export const chainIdToDefaultL2ChainId: { [chainId: number]: number } = {
  [ChainId.Mainnet]: ChainId.ArbitrumOne,
  [ChainId.ArbitrumOne]: ChainId.ArbitrumOne,
  [ChainId.Rinkeby]: ChainId.ArbitrumRinkeby,
  [ChainId.ArbitrumRinkeby]: ChainId.ArbitrumRinkeby,
  [ChainId.Goerli]: ChainId.ArbitrumGoerli,
  [ChainId.ArbitrumGoerli]: ChainId.ArbitrumGoerli,
  [ChainId.ArbitrumNova]: ChainId.ArbitrumNova,
  [ChainId.L1ShadowFork]: ChainId.L2ShadowFork,
  [ChainId.L2ShadowFork]: ChainId.L2ShadowFork
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
    chainIdToDefaultL2ChainId[customL1Network.chainID] = customL2Network.chainID
    chainIdToDefaultL2ChainId[customL2Network.chainID] = customL2Network.chainID

    addCustomNetwork({ customL1Network, customL2Network })
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

export function isNetwork(network: L1Network | L2Network) {
  const chainId = network.chainID

  return {
    // L1
    isMainnet: chainId === ChainId.Mainnet || chainId === ChainId.L1ShadowFork,
    // L1 Testnets
    isRinkeby: chainId === ChainId.Rinkeby,
    isGoerli: chainId === ChainId.Goerli,
    // L2
    isArbitrum: Boolean((network as any).isArbitrum),
    isArbitrumOne: chainId === ChainId.ArbitrumOne || chainId === ChainId.L2ShadowFork,
    isArbitrumNova: chainId === ChainId.ArbitrumNova,
    // L2 Testnets
    isArbitrumRinkeby: chainId === ChainId.ArbitrumRinkeby,
    isArbitrumGoerliRollup: chainId === ChainId.ArbitrumGoerli
  }
}

export function getNetworkName(
  chainIdOrNetwork: number | L1Network | L2Network
) {
  let chainId: number

  if (typeof chainIdOrNetwork === 'number') {
    chainId = chainIdOrNetwork
  } else {
    chainId = chainIdOrNetwork.chainID
  }

  switch (chainId) {
    case ChainId.Mainnet:
      return 'Mainnet'

    case ChainId.Rinkeby:
      return 'Rinkeby'

    case ChainId.Goerli:
      return 'Goerli'

    case ChainId.ArbitrumOne:
      return 'Arbitrum One'

    case ChainId.ArbitrumNova:
      return 'Arbitrum Nova'

    case ChainId.ArbitrumRinkeby:
      return 'Arbitrum Rinkeby'

    case ChainId.ArbitrumGoerli:
      return 'Arbitrum Goerli'
    
    case ChainId.L1ShadowFork:
      return 'L1 Shadow Fork'
    
    case ChainId.L2ShadowFork:
      return 'L2 Shadow Fork'

    default:
      return 'Unknown'
  }
}
