import {
  L1Network,
  L2Network,
  addCustomNetwork,
  constants
} from '@arbitrum/sdk'
import { networks as arbitrumSdkChains } from '@arbitrum/sdk/dist/lib/dataEntities/networks'

import { loadEnvironmentVariableWithFallback } from './index'
import { getBridgeUiConfigForChain } from './bridgeUiConfig'
import { orbitMainnets, orbitTestnets } from './orbitChainsList'

export const getChains = () => {
  const chains = Object.values(arbitrumSdkChains)
  return chains.filter(chain => chain.chainID !== 1338)
}

export const customChainLocalStorageKey = 'arbitrum:custom:chains'

export const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY

if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided')
}

const MAINNET_INFURA_RPC_URL = `https://mainnet.infura.io/v3/${INFURA_KEY}`
const GOERLI_INFURA_RPC_URL = `https://goerli.infura.io/v3/${INFURA_KEY}`
const SEPOLIA_INFURA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`

export type ChainWithRpcUrl = L2Network & {
  rpcUrl: string
  slug?: string
}

function getParentChain(chain: L2Network): L1Network | L2Network {
  const parentChain = arbitrumSdkChains[chain.partnerChainID]

  if (typeof parentChain === 'undefined') {
    throw new Error(
      `[getParentChain] parent chain ${chain.partnerChainID} not found for ${chain.chainID}`
    )
  }

  return parentChain
}

export function getBaseChainIdByChainId({
  chainId
}: {
  chainId: number
}): number {
  const chain = arbitrumSdkChains[chainId]

  // the chain provided is an L1 chain, so we can return early
  if (!chain || isL1Chain(chain)) {
    return chainId
  }

  let currentParentChain = getParentChain(chain)
  // keep following the parent chains until we find the L1 chain
  while (!isL1Chain(currentParentChain)) {
    currentParentChain = getParentChain(currentParentChain)
  }

  return currentParentChain.chainID
}

export function getCustomChainsFromLocalStorage(): ChainWithRpcUrl[] {
  const customChainsFromLocalStorage = localStorage.getItem(
    customChainLocalStorageKey
  )

  if (!customChainsFromLocalStorage) {
    return []
  }

  return (JSON.parse(customChainsFromLocalStorage) as ChainWithRpcUrl[])
    .filter(
      // filter again in case local storage is compromised
      chain => !supportedCustomOrbitParentChains.includes(Number(chain.chainID))
    )
    .map(chain => {
      return {
        ...chain,
        // make sure chainID is numeric
        chainID: Number(chain.chainID)
      }
    })
}

export function getCustomChainFromLocalStorageById(chainId: ChainId) {
  const customChains = getCustomChainsFromLocalStorage()

  if (!customChains) {
    return undefined
  }

  return customChains.find(chain => chain.chainID === chainId)
}

export function saveCustomChainToLocalStorage(newCustomChain: ChainWithRpcUrl) {
  const customChains = getCustomChainsFromLocalStorage()

  if (
    customChains.findIndex(chain => chain.chainID === newCustomChain.chainID) >
    -1
  ) {
    // chain already exists
    return
  }

  const newCustomChains = [...getCustomChainsFromLocalStorage(), newCustomChain]
  localStorage.setItem(
    customChainLocalStorageKey,
    JSON.stringify(newCustomChains)
  )
}

export function removeCustomChainFromLocalStorage(chainId: number) {
  const newCustomChains = getCustomChainsFromLocalStorage().filter(
    chain => chain.chainID !== chainId
  )
  localStorage.setItem(
    customChainLocalStorageKey,
    JSON.stringify(newCustomChains)
  )
}

export enum ChainId {
  // L1
  Ethereum = 1,
  // L1 Testnets
  Goerli = 5,
  Local = 1337,
  Sepolia = 11155111,
  // L2
  ArbitrumOne = 42161,
  ArbitrumNova = 42170,
  // L2 Testnets
  ArbitrumGoerli = 421613,
  ArbitrumSepolia = 421614,
  ArbitrumLocal = 412346,
  // Orbit
  StylusTestnet = 23011913
}

export const supportedCustomOrbitParentChains = [
  ChainId.Sepolia,
  ChainId.ArbitrumGoerli,
  ChainId.ArbitrumSepolia
]

export const rpcURLs: { [chainId: number]: string } = {
  // L1
  [ChainId.Ethereum]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
    fallback: MAINNET_INFURA_RPC_URL
  }),
  // L1 Testnets
  [ChainId.Goerli]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_GOERLI_RPC_URL,
    fallback: GOERLI_INFURA_RPC_URL
  }),
  [ChainId.Sepolia]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
    fallback: SEPOLIA_INFURA_RPC_URL
  }),
  // L2
  [ChainId.ArbitrumOne]: 'https://arb1.arbitrum.io/rpc',
  [ChainId.ArbitrumNova]: 'https://nova.arbitrum.io/rpc',
  // L2 Testnets
  [ChainId.ArbitrumGoerli]: 'https://goerli-rollup.arbitrum.io/rpc',
  [ChainId.ArbitrumSepolia]: 'https://sepolia-rollup.arbitrum.io/rpc',
  // Orbit Testnets
  [ChainId.StylusTestnet]: 'https://stylus-testnet.arbitrum.io/rpc'
}

export const explorerUrls: { [chainId: number]: string } = {
  // L1
  [ChainId.Ethereum]: 'https://etherscan.io',
  // L1 Testnets
  [ChainId.Goerli]: 'https://goerli.etherscan.io',
  [ChainId.Sepolia]: 'https://sepolia.etherscan.io',
  // L2
  [ChainId.ArbitrumNova]: 'https://nova.arbiscan.io',
  [ChainId.ArbitrumOne]: 'https://arbiscan.io',
  // L2 Testnets
  [ChainId.ArbitrumGoerli]: 'https://goerli.arbiscan.io',
  [ChainId.ArbitrumSepolia]: 'https://sepolia.arbiscan.io',
  // Orbit Testnets
  [ChainId.StylusTestnet]: 'https://stylus-testnet-explorer.arbitrum.io'
}

export const getExplorerUrl = (chainId: ChainId) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return explorerUrls[chainId] ?? explorerUrls[ChainId.Ethereum]! //defaults to etherscan, can never be null
}

export const getBlockTime = (chainId: ChainId) => {
  const network = arbitrumSdkChains[chainId]
  if (!network) {
    throw new Error(`Couldn't get block time. Unexpected chain ID: ${chainId}`)
  }
  return network.blockTime
}

export const getConfirmPeriodBlocks = (chainId: ChainId) => {
  const network = arbitrumSdkChains[chainId]
  if (!network || !isArbitrumChain(network)) {
    throw new Error(
      `Couldn't get confirm period blocks. Unexpected chain ID: ${chainId}`
    )
  }
  return network.confirmPeriodBlocks
}

export const l2ArbReverseGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0xCaD7828a19b363A2B44717AFB1786B5196974D8E',
  [ChainId.ArbitrumNova]: '0xbf544970E6BD77b21C6492C281AB60d0770451F4',
  [ChainId.ArbitrumGoerli]: '0x584d4D9bED1bEb39f02bb51dE07F493D3A5CdaA0'
}

export const l2DaiGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  [ChainId.ArbitrumNova]: '0x10E6593CDda8c58a1d0f14C5164B376352a55f2F'
}

export const l2wstETHGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x07d4692291b9e30e326fd31706f686f83f331b82'
}

export const l2LptGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x6D2457a4ad276000A615295f7A80F79E48CcD318'
}

export const l2MoonGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumNova]: '0xA430a792c14d3E49d9D00FD7B4BA343F516fbB81'
}

const defaultL1Network: L1Network = {
  blockTime: 10,
  chainID: 1337,
  explorerUrl: '',
  isCustom: true,
  name: 'Ethereum Local',
  partnerChainIDs: [412346],
  isArbitrum: false
}

const defaultL2Network: L2Network = {
  chainID: 412346,
  partnerChainIDs: [
    // Orbit chains will go here
  ],
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0x2b360a9881f21c3d7aa0ea6ca0de2a3341d4ef3c',
    inbox: '0xff4a24b22f94979e9ba5f3eb35838aa814bad6f1',
    outbox: '0x49940929c7cA9b50Ff57a01d3a92817A414E6B9B',
    rollup: '0x65a59d67da8e710ef9a01eca37f83f84aedec416',
    sequencerInbox: '0xe7362d0787b51d8c72d504803e5b1d6dcda89540'
  },
  explorerUrl: '',
  isArbitrum: true,
  isCustom: true,
  name: 'Arbitrum Local',
  partnerChainID: 1337,
  retryableLifetimeSeconds: 604800,
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 900000,
  blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
  tokenBridge: {
    l1CustomGateway: '0x75E0E92A79880Bd81A69F72983D03c75e2B33dC8',
    l1ERC20Gateway: '0x4Af567288e68caD4aA93A272fe6139Ca53859C70',
    l1GatewayRouter: '0x85D9a8a4bd77b9b5559c1B7FCb8eC9635922Ed49',
    l1MultiCall: '0xA39FFA43ebA037D67a0f4fe91956038ABA0CA386',
    l1ProxyAdmin: '0x7E32b54800705876d3b5cFbc7d9c226a211F7C1a',
    l1Weth: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
    l1WethGateway: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
    l2CustomGateway: '0x525c2aBA45F66987217323E8a05EA400C65D06DC',
    l2ERC20Gateway: '0xe1080224B632A93951A7CFA33EeEa9Fd81558b5e',
    l2GatewayRouter: '0x1294b86822ff4976BfE136cB06CF43eC7FCF2574',
    l2Multicall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
    l2ProxyAdmin: '0xda52b25ddB0e3B9CC393b0690Ac62245Ac772527',
    l2Weth: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
    l2WethGateway: '0x4A2bA922052bA54e29c5417bC979Daaf7D5Fe4f4'
  }
}

export type RegisterLocalNetworkParams = {
  l1Network: L1Network
  l2Network: L2Network
}

const registerLocalNetworkDefaultParams: RegisterLocalNetworkParams = {
  l1Network: defaultL1Network,
  l2Network: defaultL2Network
}

export const localL1NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL,
  fallback: 'http://localhost:8545'
})
export const localL2NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL,
  fallback: 'http://localhost:8547'
})

export function registerLocalNetwork(
  params: RegisterLocalNetworkParams = registerLocalNetworkDefaultParams
) {
  const { l1Network, l2Network } = params

  try {
    rpcURLs[l1Network.chainID] = localL1NetworkRpcUrl
    rpcURLs[l2Network.chainID] = localL2NetworkRpcUrl

    addCustomNetwork({ customL1Network: l1Network, customL2Network: l2Network })
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

export function isNetwork(chainId: ChainId) {
  const customChains = getCustomChainsFromLocalStorage()
  const isMainnetOrbitChain = chainId in orbitMainnets
  const isTestnetOrbitChain = chainId in orbitTestnets

  const isEthereumMainnet = chainId === ChainId.Ethereum

  const isGoerli = chainId === ChainId.Goerli
  const isSepolia = chainId === ChainId.Sepolia
  const isLocal = chainId === ChainId.Local

  const isArbitrumOne = chainId === ChainId.ArbitrumOne
  const isArbitrumNova = chainId === ChainId.ArbitrumNova
  const isArbitrumGoerli = chainId === ChainId.ArbitrumGoerli
  const isArbitrumSepolia = chainId === ChainId.ArbitrumSepolia
  const isArbitrumLocal = chainId === ChainId.ArbitrumLocal

  const isStylusTestnet = chainId === ChainId.StylusTestnet

  const isEthereumMainnetOrTestnet =
    isEthereumMainnet || isGoerli || isSepolia || isLocal

  const isArbitrum =
    isArbitrumOne ||
    isArbitrumNova ||
    isArbitrumGoerli ||
    isArbitrumLocal ||
    isArbitrumSepolia

  const customChainIds = customChains.map(chain => chain.chainID)
  const isCustomOrbitChain = customChainIds.includes(chainId)

  const isCoreChain = isEthereumMainnetOrTestnet || isArbitrum
  const isOrbitChain = !isCoreChain

  const isTestnet =
    isGoerli ||
    isLocal ||
    isArbitrumGoerli ||
    isArbitrumLocal ||
    isSepolia ||
    isArbitrumSepolia ||
    isCustomOrbitChain ||
    isStylusTestnet ||
    isTestnetOrbitChain

  const isSupported =
    isArbitrumOne ||
    isArbitrumNova ||
    isEthereumMainnet ||
    isGoerli ||
    isArbitrumGoerli ||
    isSepolia ||
    isArbitrumSepolia ||
    isCustomOrbitChain ||
    isMainnetOrbitChain ||
    isTestnetOrbitChain

  return {
    // L1
    isEthereumMainnet,
    isEthereumMainnetOrTestnet,
    // L1 Testnets
    isGoerli,
    isSepolia,
    // L2
    isArbitrum,
    isArbitrumOne,
    isArbitrumNova,
    // L2 Testnets
    isArbitrumGoerli,
    isArbitrumSepolia,
    // Orbit chains
    isOrbitChain,
    isTestnet,
    // General
    isSupported,
    // Core Chain is a chain category for the UI
    isCoreChain
  }
}

export function getNetworkName(chainId: number) {
  return getBridgeUiConfigForChain(chainId).network.name
}

export function getSupportedChainIds({
  includeMainnets = true,
  includeTestnets = false
}: {
  includeMainnets?: boolean
  includeTestnets?: boolean
}): ChainId[] {
  return getChains()
    .map(chain => chain.chainID)
    .filter(chainId => {
      const { isTestnet } = isNetwork(chainId)
      if (includeMainnets && !includeTestnets) {
        return !isTestnet
      }
      if (!includeMainnets && includeTestnets) {
        return isTestnet
      }
      if (!includeMainnets && !includeTestnets) {
        return false
      }
      return true
    })
}

export function mapCustomChainToNetworkData(chain: ChainWithRpcUrl) {
  // custom chain details need to be added to various objects to make it work with the UI
  //
  // add RPC
  rpcURLs[chain.chainID] = chain.rpcUrl
  // explorer URL
  explorerUrls[chain.chainID] = chain.explorerUrl
}

function isL1Chain(chain: L1Network | L2Network): chain is L1Network {
  return !chain.isArbitrum
}

function isArbitrumChain(chain: L1Network | L2Network): chain is L2Network {
  return chain.isArbitrum
}

export function getDestinationChainIds(chainId: ChainId): ChainId[] {
  const chains = getChains()
  const arbitrumSdkChain = chains.find(chain => chain.chainID === chainId)

  if (!arbitrumSdkChain) {
    return []
  }

  const parentChainId = isArbitrumChain(arbitrumSdkChain)
    ? arbitrumSdkChain.partnerChainID
    : undefined

  const validDestinationChainIds =
    chains.find(chain => chain.chainID === chainId)?.partnerChainIDs || []

  if (parentChainId) {
    // always make parent chain the first element
    return [parentChainId, ...validDestinationChainIds]
  }

  return validDestinationChainIds
}
