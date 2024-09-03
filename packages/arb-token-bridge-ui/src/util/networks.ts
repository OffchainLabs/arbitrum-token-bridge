import {
  ArbitrumNetwork,
  getChildrenForNetwork,
  getArbitrumNetwork,
  getArbitrumNetworks,
  registerCustomArbitrumNetwork
} from '@arbitrum/sdk'

import { loadEnvironmentVariableWithFallback } from './index'
import { getBridgeUiConfigForChain } from './bridgeUiConfig'
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
  ArbitrumLocal = 412346,
  // L3 Testnets
  L3Local = 333333
}

type L1Network = {
  chainId: ChainId
  blockTime: number
  isTestnet: boolean
}

const l1Networks: { [chainId: number]: L1Network } = {
  [ChainId.Ethereum]: {
    chainId: ChainId.Ethereum,
    blockTime: 12,
    isTestnet: false
  },
  [ChainId.Sepolia]: {
    chainId: ChainId.Sepolia,
    blockTime: 12,
    isTestnet: true
  },
  [ChainId.Holesky]: {
    chainId: ChainId.Holesky,
    blockTime: 12,
    isTestnet: true
  },
  [ChainId.Local]: {
    chainId: ChainId.Local,
    blockTime: 12,
    isTestnet: true
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
  chainId: 1337,
  isTestnet: true
}

export const defaultL2Network: ArbitrumNetwork = {
  chainId: 412346,
  parentChainId: ChainId.Local,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0x5eCF728ffC5C5E802091875f96281B5aeECf6C49',
    inbox: '0x9f8c1c641336A371031499e3c362e40d58d0f254',
    outbox: '0x50143333b44Ea46255BEb67255C9Afd35551072F',
    rollup: process.env.NEXT_PUBLIC_IS_E2E_TEST
      ? '0xE8A8F50F2a237D06D0087D14E690f6Ff0556259D'
      : '0x46966d871d29e1772c2809459469f849d8AAb1A3',
    sequencerInbox: '0x18d19C5d3E685f5be5b9C86E097f0E439285D216'
  },
  isCustom: true,
  isTestnet: true,
  name: 'Arbitrum Local',
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    parentCustomGateway: '0x8407E6180dC009D20D26D4BABB4790C1d4E6D2aA',
    parentErc20Gateway: '0x00D9fE1a2B67B8151aEdE8855c95E58D73FB4245',
    parentGatewayRouter: '0x093AAa96CD4387A68FC0e24C60140938Dc812549',
    parentMultiCall: '0x49117fC32930E324F2E9A7BeA588FFb26008b8eC',
    parentProxyAdmin: '0x2A1f38c9097e7883570e0b02BFBE6869Cc25d8a3',
    parentWeth: '0x7E32b54800705876d3b5cFbc7d9c226a211F7C1a',
    parentWethGateway: '0xB8F48Ba39fCfB44d70F6008fe1bf4F3E744044AF',
    childCustomGateway: '0x0B35cfE62314C3852A0942b5830c728353BD654F',
    childErc20Gateway: '0x7424e3DAAAAcd867c85ceB75c1E00119F2ee5eb7',
    childGatewayRouter: '0x32656396981868E925280FB772b3f806892cf4bF',
    childMultiCall: '0x6B1E93aE298B64e8f5b9f43B65Dd8F1eaA6DD4c3',
    childProxyAdmin: '0x9F95547ABB0FfC92b4E37b3124d1e8613d5aB74A',
    childWeth: '0xA1abD387192e3bb4e84D3109181F9f005aBaF5CA',
    childWethGateway: '0x67aE8014BD1A0c1Ed747715d22b3b3a188aC324B'
  }
}

export const defaultL3Network: ArbitrumNetwork = {
  chainId: 333333,
  parentChainId: ChainId.ArbitrumLocal,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0xA584795e24628D9c067A6480b033C9E96281fcA3',
    inbox: '0xDcA690902d3154886Ec259308258D10EA5450996',
    outbox: '0xda243bD61B011024FC923164db75Dde198AC6175',
    rollup: process.env.NEXT_PUBLIC_IS_E2E_TEST
      ? '0xdeD540257498027B1De7DFD4fe6cc4CeC030F355'
      : '0xf9B0F86aCc3e42B7DF373c9a8adb2803BF0a7662',
    sequencerInbox: '0x16c54EE2015CD824415c2077F4103f444E00A8cb'
  },
  isCustom: true,
  isTestnet: true,
  name: 'L3 Local',
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    parentCustomGateway: '0xA191D519260A06b32f8D04c84b9F457B8Caa0514',
    parentErc20Gateway: '0x6B0805Fc6e275ef66a0901D0CE68805631E271e5',
    parentGatewayRouter: '0xfE03DBdf7A126994dBd749631D7fbaB58C618c58',
    parentMultiCall: '0x20a3627Dcc53756E38aE3F92717DE9B23617b422',
    parentProxyAdmin: '0x1A61102c26ad3f64bA715B444C93388491fd8E68',
    parentWeth: '0xA1abD387192e3bb4e84D3109181F9f005aBaF5CA',
    parentWethGateway: '0x77603b0ea6a797C74Fa9ef11b5BdE04A4E03D550',
    childCustomGateway: '0xD4816AeF8f85A3C1E01Cd071a81daD4fa941625f',
    childErc20Gateway: '0xaa7d51aFFEeB32d99b1CB2fd6d81D7adA4a896e8',
    childGatewayRouter: '0x8B6BC759226f8Fe687c8aD8Cc0DbF85E095e9297',
    childMultiCall: '0x052B15c8Ff0544287AE689C4F2FC53A3905d7Db3',
    childProxyAdmin: '0x36C56eC2CF3a3f53db9F01d0A5Ae84b36fb0A1e2',
    childWeth: '0x582a8dBc77f665dF2c49Ce0a138978e9267dd968',
    childWethGateway: '0xA6AB233B3c7bfd0399834897b5073974A3D467e2'
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
export const localL3NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_LOCAL_L3_RPC_URL,
  fallback: 'http://127.0.0.1:3347'
})

export function registerLocalNetwork() {
  try {
    rpcURLs[defaultL1Network.chainId] = localL1NetworkRpcUrl
    rpcURLs[defaultL2Network.chainId] = localL2NetworkRpcUrl
    rpcURLs[defaultL3Network.chainId] = localL3NetworkRpcUrl

    registerCustomArbitrumNetwork(defaultL2Network)
    registerCustomArbitrumNetwork(defaultL3Network)
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

function isTestnetChain(chainId: ChainId) {
  const l1Network = l1Networks[chainId]
  if (l1Network) {
    return l1Network.isTestnet
  }

  try {
    return getArbitrumNetwork(chainId).isTestnet
  } catch {
    // users could have data in local storage for chains that aren't supported anymore, avoid app error
    return true
  }
}

export function isNetwork(chainId: ChainId) {
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

  const isCoreChain = isEthereumMainnetOrTestnet || isArbitrum
  const isOrbitChain = !isCoreChain

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
    // General
    isTestnet: isTestnetChain(chainId),
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
  [ChainId.Ethereum]: [1380012617, 70700, 70701], // Rari, PopApex and PopBoss
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
