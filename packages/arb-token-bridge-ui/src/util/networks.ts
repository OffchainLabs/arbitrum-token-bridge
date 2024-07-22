import {
  ArbitrumNetwork,
  getChildrenForNetwork,
  getArbitrumNetwork,
  getArbitrumNetworks,
  registerCustomArbitrumNetwork
} from '@arbitrum/sdk'

import { loadEnvironmentVariableWithFallback } from './index'
import { getBridgeUiConfigForChain } from './bridgeUiConfig'
import { orbitMainnets, orbitTestnets } from './orbitChainsList'
import { chainIdToInfuraUrl } from './infura'

export enum ChainId {
  // L1
  Ethereum = 1,
  // L1 Testnets
  Local = 1337,
  Sepolia = 11155111,
  Holesky = 17000,
  // L2
  ArbitrumOne = 42161,
  ArbitrumNova = 42170,
  // L2 Testnets
  ArbitrumSepolia = 421614,
  ArbitrumLocal = 412346
}

type L1Network = {
  chainId: ChainId
  blockTime: number
}

const l1Networks: { [chainId: number]: L1Network } = {
  [ChainId.Ethereum]: {
    chainId: ChainId.Ethereum,
    blockTime: 12
  },
  [ChainId.Sepolia]: {
    chainId: ChainId.Sepolia,
    blockTime: 12
  },
  [ChainId.Holesky]: {
    chainId: ChainId.Holesky,
    blockTime: 12
  },
  [ChainId.Local]: {
    chainId: ChainId.Local,
    blockTime: 12
  }
}

export const getChains = () => {
  const chains = [...Object.values(l1Networks), ...getArbitrumNetworks()]

  return chains.filter(chain => {
    // exclude L1 chains with no child chains
    if (isL1Chain(chain) && getChildrenForNetwork(chain.chainId).length === 0) {
      return false
    }

    return true
  })
}

function getChainByChainId(chainId: number) {
  return getChains().find(c => c.chainId === chainId)
}

export const customChainLocalStorageKey = 'arbitrum:custom:chains'

export type ChainWithRpcUrl = ArbitrumNetwork & {
  rpcUrl: string
  explorerUrl: string
  slug?: string
}

export function getBaseChainIdByChainId({
  chainId
}: {
  chainId: number
}): number {
  // the chain provided is an L1 chain, so we can return early
  if (isL1Chain({ chainId })) {
    return chainId
  }

  let currentParentChain: L1Network | ArbitrumNetwork

  try {
    currentParentChain = getArbitrumNetwork(chainId)
  } catch (error) {
    return chainId
  }

  // keep following the parent chains until we find the L1 chain
  while (true) {
    if (isL1Chain(currentParentChain)) {
      return currentParentChain.chainId
    }

    const newParentChain = getChains().find(
      c => c.chainId === (currentParentChain as ArbitrumNetwork).parentChainId
    )

    if (!newParentChain) {
      return currentParentChain.chainId
    }

    currentParentChain = newParentChain
  }
}

export function getCustomChainsFromLocalStorage(): ChainWithRpcUrl[] {
  if (typeof localStorage === 'undefined') return [] // required so that it does not fail test-runners

  const customChainsFromLocalStorage = localStorage.getItem(
    customChainLocalStorageKey
  )

  if (!customChainsFromLocalStorage) {
    return []
  }

  return (JSON.parse(customChainsFromLocalStorage) as ChainWithRpcUrl[])
    .filter(
      // filter again in case local storage is compromised
      chain => !supportedCustomOrbitParentChains.includes(Number(chain.chainId))
    )
    .map(chain => {
      // chainID is used in previously stored custom orbit chains
      // if we don't make it backwards compatible then the app will hang on load if at least one old chain is present
      const _chain = chain as ChainWithRpcUrl & { chainID?: string }

      return {
        ..._chain,
        // make sure chainId is numeric
        chainId: Number(_chain.chainId ?? _chain.chainID)
      }
    })
}

export function getCustomChainFromLocalStorageById(chainId: ChainId) {
  const customChains = getCustomChainsFromLocalStorage()

  if (!customChains) {
    return undefined
  }

  return customChains.find(chain => chain.chainId === chainId)
}

export function saveCustomChainToLocalStorage(newCustomChain: ChainWithRpcUrl) {
  const customChains = getCustomChainsFromLocalStorage()

  if (
    customChains.findIndex(chain => chain.chainId === newCustomChain.chainId) >
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
    chain => chain.chainId !== chainId
  )
  localStorage.setItem(
    customChainLocalStorageKey,
    JSON.stringify(newCustomChains)
  )
}

export const supportedCustomOrbitParentChains = [
  ChainId.Sepolia,
  ChainId.Holesky,
  ChainId.ArbitrumSepolia
]

export const rpcURLs: { [chainId: number]: string } = {
  // L1
  [ChainId.Ethereum]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
    fallback: chainIdToInfuraUrl(ChainId.Ethereum)
  }),
  // L1 Testnets
  [ChainId.Sepolia]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
    fallback: chainIdToInfuraUrl(ChainId.Sepolia)
  }),
  [ChainId.Holesky]: 'https://ethereum-holesky-rpc.publicnode.com',
  // L2
  [ChainId.ArbitrumOne]: loadEnvironmentVariableWithFallback({
    env: chainIdToInfuraUrl(ChainId.ArbitrumOne),
    fallback: 'https://arb1.arbitrum.io/rpc'
  }),
  [ChainId.ArbitrumNova]: 'https://nova.arbitrum.io/rpc',
  // L2 Testnets
  [ChainId.ArbitrumSepolia]: loadEnvironmentVariableWithFallback({
    env: chainIdToInfuraUrl(ChainId.ArbitrumSepolia),
    fallback: 'https://sepolia-rollup.arbitrum.io/rpc'
  })
}

export const explorerUrls: { [chainId: number]: string } = {
  // L1
  [ChainId.Ethereum]: 'https://etherscan.io',
  // L1 Testnets
  [ChainId.Sepolia]: 'https://sepolia.etherscan.io',
  [ChainId.Holesky]: 'https://holesky.etherscan.io',
  // L2
  [ChainId.ArbitrumNova]: 'https://nova.arbiscan.io',
  [ChainId.ArbitrumOne]: 'https://arbiscan.io',
  // L2 Testnets
  [ChainId.ArbitrumSepolia]: 'https://sepolia.arbiscan.io'
}

export const getExplorerUrl = (chainId: ChainId) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return explorerUrls[chainId] ?? explorerUrls[ChainId.Ethereum]! //defaults to etherscan, can never be null
}

export const getL1BlockTime = (chainId: number) => {
  const chain = getChainByChainId(getBaseChainIdByChainId({ chainId }))

  if (!chain || !isL1Chain(chain)) {
    throw new Error(`Couldn't get block time. Unexpected chain ID: ${chainId}`)
  }

  return chain.blockTime
}

export const getConfirmPeriodBlocks = (chainId: ChainId) => {
  return getArbitrumNetwork(chainId).confirmPeriodBlocks
}

export const l2ArbReverseGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0xCaD7828a19b363A2B44717AFB1786B5196974D8E',
  [ChainId.ArbitrumNova]: '0xbf544970E6BD77b21C6492C281AB60d0770451F4'
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
  chainId: 1337
}

const defaultL2Network: ArbitrumNetwork = {
  chainId: 412346,
  parentChainId: ChainId.Local,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0x2b360a9881f21c3d7aa0ea6ca0de2a3341d4ef3c',
    inbox: '0xff4a24b22f94979e9ba5f3eb35838aa814bad6f1',
    outbox: '0x49940929c7cA9b50Ff57a01d3a92817A414E6B9B',
    rollup: '0x65a59d67da8e710ef9a01eca37f83f84aedec416',
    sequencerInbox: '0xe7362d0787b51d8c72d504803e5b1d6dcda89540'
  },
  isCustom: true,
  name: 'Arbitrum Local',
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    parentCustomGateway: '0x75E0E92A79880Bd81A69F72983D03c75e2B33dC8',
    parentErc20Gateway: '0x4Af567288e68caD4aA93A272fe6139Ca53859C70',
    parentGatewayRouter: '0x85D9a8a4bd77b9b5559c1B7FCb8eC9635922Ed49',
    parentMultiCall: '0xA39FFA43ebA037D67a0f4fe91956038ABA0CA386',
    parentProxyAdmin: '0x7E32b54800705876d3b5cFbc7d9c226a211F7C1a',
    parentWeth: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
    parentWethGateway: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
    childCustomGateway: '0x525c2aBA45F66987217323E8a05EA400C65D06DC',
    childErc20Gateway: '0xe1080224B632A93951A7CFA33EeEa9Fd81558b5e',
    childGatewayRouter: '0x1294b86822ff4976BfE136cB06CF43eC7FCF2574',
    childMultiCall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
    childProxyAdmin: '0xda52b25ddB0e3B9CC393b0690Ac62245Ac772527',
    childWeth: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
    childWethGateway: '0x4A2bA922052bA54e29c5417bC979Daaf7D5Fe4f4'
  }
}

export const localL1NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL,
  fallback: 'http://127.0.0.1:8545'
})
export const localL2NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL,
  fallback: 'http://127.0.0.1:8547'
})

export function registerLocalNetwork() {
  try {
    rpcURLs[defaultL1Network.chainId] = localL1NetworkRpcUrl
    rpcURLs[defaultL2Network.chainId] = localL2NetworkRpcUrl

    registerCustomArbitrumNetwork(defaultL2Network)
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

export function isNetwork(chainId: ChainId) {
  const customChains = getCustomChainsFromLocalStorage()
  const isMainnetOrbitChain = chainId in orbitMainnets
  const isTestnetOrbitChain = chainId in orbitTestnets

  const isEthereumMainnet = chainId === ChainId.Ethereum

  const isSepolia = chainId === ChainId.Sepolia
  const isHolesky = chainId === ChainId.Holesky
  const isLocal = chainId === ChainId.Local

  const isArbitrumOne = chainId === ChainId.ArbitrumOne
  const isArbitrumNova = chainId === ChainId.ArbitrumNova
  const isArbitrumSepolia = chainId === ChainId.ArbitrumSepolia
  const isArbitrumLocal = chainId === ChainId.ArbitrumLocal

  const isEthereumMainnetOrTestnet =
    isEthereumMainnet || isSepolia || isHolesky || isLocal

  const isArbitrum =
    isArbitrumOne || isArbitrumNova || isArbitrumLocal || isArbitrumSepolia

  const customChainIds = customChains.map(chain => chain.chainId)
  const isCustomOrbitChain = customChainIds.includes(chainId)

  const isCoreChain = isEthereumMainnetOrTestnet || isArbitrum
  const isOrbitChain = !isCoreChain

  const isTestnet =
    isLocal ||
    isArbitrumLocal ||
    isSepolia ||
    isHolesky ||
    isArbitrumSepolia ||
    isCustomOrbitChain ||
    isTestnetOrbitChain

  const isSupported =
    isArbitrumOne ||
    isArbitrumNova ||
    isEthereumMainnet ||
    isSepolia ||
    isHolesky ||
    isArbitrumSepolia ||
    isCustomOrbitChain ||
    isMainnetOrbitChain ||
    isTestnetOrbitChain

  return {
    // L1
    isEthereumMainnet,
    isEthereumMainnetOrTestnet,
    // L1 Testnets
    isSepolia,
    // L2
    isArbitrum,
    isArbitrumOne,
    isArbitrumNova,
    // L2 Testnets
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
    .map(chain => chain.chainId)
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
  rpcURLs[chain.chainId] = chain.rpcUrl
  // explorer URL
  explorerUrls[chain.chainId] = chain.explorerUrl
}

function isL1Chain(chain: { chainId: number }): chain is L1Network {
  return typeof l1Networks[chain.chainId] !== 'undefined'
}

function isArbitrumChain(
  chain: L1Network | ArbitrumNetwork
): chain is ArbitrumNetwork {
  return typeof (chain as ArbitrumNetwork).parentChainId !== 'undefined'
}

export const TELEPORT_ALLOWLIST: { [id: number]: number[] } = {
  [ChainId.Ethereum]: [1380012617, 70700], // Rari and PopApex
  [ChainId.Sepolia]: [1918988905] // RARI Testnet
}

export function getChildChainIds(chain: ArbitrumNetwork | L1Network) {
  const childChainIds = [
    ...getChildrenForNetwork(chain.chainId).map(chain => chain.chainId),
    ...(TELEPORT_ALLOWLIST[chain.chainId] ?? []) // for considering teleport (L1-L3 transfers) we will get the L3 children of the chain, if present
  ]
  return Array.from(new Set(childChainIds))
}

export function getDestinationChainIds(chainId: ChainId): ChainId[] {
  const chain = getChainByChainId(chainId)

  if (!chain) {
    return []
  }

  const parentChainId = isArbitrumChain(chain) ? chain.parentChainId : undefined

  const validDestinationChainIds = getChildChainIds(chain)

  if (parentChainId) {
    // always make parent chain the first element
    return [parentChainId, ...validDestinationChainIds]
  }

  return validDestinationChainIds
}
