import { StaticJsonRpcProvider } from '@ethersproject/providers'
import {
  ArbitrumNetwork,
  getChildrenForNetwork,
  getArbitrumNetwork,
  getArbitrumNetworks,
  registerCustomArbitrumNetwork
} from '@arbitrum/sdk'

import { loadEnvironmentVariableWithFallback } from './index'
import { getBridgeUiConfigForChain } from './bridgeUiConfig'
import { Erc20Data, fetchErc20Data } from './TokenUtils'
import { orbitChains } from './orbitChainsList'
import { ChainId } from '../types/ChainId'
import { getRpcUrl } from './rpc/getRpcUrl'
import {
  defaultL2Network,
  defaultL3Network,
  defaultL3CustomGasTokenNetwork
} from './networksNitroTestnode'
import { isE2eTestingEnvironment, isProductionEnvironment } from './CommonUtils'
import { lifiDestinationChainIds } from '../app/api/crosschain-transfers/constants'

/** The network that you reference when calling `block.number` in solidity */
type BlockNumberReferenceNetwork = {
  chainId: ChainId
  blockTime: number
  isTestnet: boolean
}

const l1Networks: { [chainId: number]: BlockNumberReferenceNetwork } = {
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
  [ChainId.Local]: {
    chainId: ChainId.Local,
    blockTime: 12,
    isTestnet: true
  }
}

const baseNetworks: { [chainId: number]: BlockNumberReferenceNetwork } = {
  [ChainId.Base]: {
    chainId: ChainId.Base,
    blockTime: 2,
    isTestnet: false
  },
  [ChainId.BaseSepolia]: {
    chainId: ChainId.BaseSepolia,
    blockTime: 2,
    isTestnet: true
  }
}
export const getChains = (
  { includeRootChainsWithoutDestination } = {
    includeRootChainsWithoutDestination: false
  }
) => {
  const chains: (BlockNumberReferenceNetwork | ArbitrumNetwork)[] = [
    ...Object.values(l1Networks),
    ...Object.values(baseNetworks),
    ...getArbitrumNetworks()
  ]

  if (includeRootChainsWithoutDestination) {
    return chains
  }

  return chains.filter(chain => {
    if (
      isBlockNumberReferenceNetwork(chain) &&
      getChildrenForNetwork(chain.chainId).length === 0
    ) {
      // exclude L1 chains or Base Chains with no child chains
      return false
    }

    return true
  })
}

export function getChainByChainId(
  chainId: number,
  { includeRootChainsWithoutDestination } = {
    includeRootChainsWithoutDestination: false
  }
) {
  return getChains({ includeRootChainsWithoutDestination }).find(
    c => c.chainId === chainId
  )
}

export const customChainLocalStorageKey = 'arbitrum:custom:chains'

export type ChainWithRpcUrl = ArbitrumNetwork & {
  rpcUrl: string
  explorerUrl: string
  slug?: string
  nativeTokenData?: Erc20Data
}

export function getBlockNumberReferenceChainIdByChainId({
  chainId
}: {
  chainId: number
}): number {
  // the chain provided is an L1 chain or Base chain, so we can return early
  if (isBlockNumberReferenceNetwork({ chainId })) {
    return chainId
  }

  let currentParentChain: BlockNumberReferenceNetwork | ArbitrumNetwork

  try {
    currentParentChain = getArbitrumNetwork(chainId)
  } catch (error) {
    return chainId
  }

  // keep following the parent chains until we find the L1/Base chain
  while (true) {
    if (isBlockNumberReferenceNetwork(currentParentChain)) {
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
  ChainId.Ethereum,
  ChainId.ArbitrumOne,
  ChainId.ArbitrumNova,
  ChainId.Base,
  ChainId.Sepolia,
  ChainId.ArbitrumSepolia,
  ChainId.BaseSepolia
]

const defaultL1Network: BlockNumberReferenceNetwork = {
  blockTime: 10,
  chainId: 1337,
  isTestnet: true
}

export const localL1NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1,
  fallback: 'http://127.0.0.1:8545'
})
export const localL2NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2,
  fallback: 'http://127.0.0.1:8547'
})
export const localL3NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3,
  fallback: 'http://127.0.0.1:3347'
})

const defaultRpcUrls: { [chainId: number]: string } = {
  // L1 Mainnet
  [ChainId.Ethereum]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_RPC_URL_ETHEREUM,
    fallback: getRpcUrl(ChainId.Ethereum)
  }),
  // L1 Testnet
  [ChainId.Sepolia]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA,
    fallback: getRpcUrl(ChainId.Sepolia)
  }),
  // L2 Mainnet
  [ChainId.ArbitrumOne]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM_ONE,
    fallback: getRpcUrl(ChainId.ArbitrumOne)
  }),
  [ChainId.ArbitrumNova]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM_NOVA,
    fallback: getRpcUrl(ChainId.ArbitrumNova)
  }),
  [ChainId.Base]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_RPC_URL_BASE,
    fallback: getRpcUrl(ChainId.Base)
  }),
  // L2 Testnet
  [ChainId.ArbitrumSepolia]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM_SEPOLIA,
    fallback: getRpcUrl(ChainId.ArbitrumSepolia)
  }),
  [ChainId.BaseSepolia]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA,
    fallback: getRpcUrl(ChainId.BaseSepolia)
  })
}

export const rpcURLs: { [chainId: number]: string } =
  !isProductionEnvironment || isE2eTestingEnvironment
    ? {
        ...defaultRpcUrls,
        [defaultL1Network.chainId]: localL1NetworkRpcUrl,
        [defaultL2Network.chainId]: localL2NetworkRpcUrl,
        [defaultL3Network.chainId]: localL3NetworkRpcUrl
      }
    : defaultRpcUrls

export const explorerUrls: { [chainId: number]: string } = {
  // L1
  [ChainId.Ethereum]: 'https://etherscan.io',
  // L1 Testnets
  [ChainId.Sepolia]: 'https://sepolia.etherscan.io',
  // L2
  [ChainId.ArbitrumNova]: 'https://nova.arbiscan.io',
  [ChainId.ArbitrumOne]: 'https://arbiscan.io',
  [ChainId.Base]: 'https://basescan.org',
  // L2 Testnets
  [ChainId.ArbitrumSepolia]: 'https://sepolia.arbiscan.io',
  [ChainId.BaseSepolia]: 'https://sepolia.basescan.org'
}

export const getExplorerUrl = (chainId: ChainId) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return explorerUrls[chainId] ?? explorerUrls[ChainId.Ethereum]! //defaults to etherscan, can never be null
}

export const getL1BlockTime = (chainId: number) => {
  const chain = getChainByChainId(
    getBlockNumberReferenceChainIdByChainId({ chainId })
  )

  if (!chain || !isBlockNumberReferenceNetwork(chain)) {
    throw new Error(`Couldn't get block time. Unexpected chain ID: ${chainId}`)
  }

  return chain.blockTime
}

export const getConfirmPeriodBlocks = (chainId: ChainId) => {
  // Base is not an Arbitrum chain so it doesn't work in the same way, and we don't support deposits from L1, or withdrawals from Base chains
  if (isNetwork(chainId).isBase) {
    return 0
  }

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

export const l2UsdcGatewayAddresses: { [chainId: number]: string } = {
  // PoP Apex
  70700: '0x97e2b88b44946cd932fb85675412699723200987',
  // Superposition
  [ChainId.Superposition]: '0xF70ae1Af7D49dA0f7D66Bb55469caC9da336181b'
}

export async function registerLocalNetwork() {
  try {
    rpcURLs[defaultL1Network.chainId] = localL1NetworkRpcUrl
    rpcURLs[defaultL2Network.chainId] = localL2NetworkRpcUrl
    rpcURLs[defaultL3Network.chainId] = localL3NetworkRpcUrl

    registerCustomArbitrumNetwork(defaultL2Network)

    let isLocalCustomNativeToken = false

    try {
      const data = await fetchErc20Data({
        address: defaultL3CustomGasTokenNetwork.nativeToken!,
        provider: new StaticJsonRpcProvider(localL2NetworkRpcUrl)
      })
      if (data.symbol === 'TN') {
        isLocalCustomNativeToken = true
      }
    } catch (e) {
      // not the native token
      isLocalCustomNativeToken = false
    }

    registerCustomArbitrumNetwork(
      isLocalCustomNativeToken
        ? defaultL3CustomGasTokenNetwork
        : defaultL3Network
    )
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

function isTestnetChain(chainId: ChainId) {
  const l1Network = l1Networks[chainId]
  if (l1Network) {
    return l1Network.isTestnet
  }

  const baseNetwork = baseNetworks[chainId]
  if (baseNetwork) {
    return baseNetwork.isTestnet
  }

  try {
    return getArbitrumNetwork(chainId).isTestnet
  } catch (error) {
    // users could have data in local storage for chains that aren't supported anymore, avoid app error
    return true
  }
}

function getIsArbitrumChain(chainId: ChainId) {
  try {
    return !!getArbitrumNetwork(chainId).parentChainId
  } catch (error) {
    return false
  }
}

export function isNetwork(chainId: ChainId) {
  const isEthereumMainnet = chainId === ChainId.Ethereum

  const isSepolia = chainId === ChainId.Sepolia
  const isLocal = chainId === ChainId.Local

  const isArbitrumOne = chainId === ChainId.ArbitrumOne
  const isArbitrumNova = chainId === ChainId.ArbitrumNova
  const isArbitrumSepolia = chainId === ChainId.ArbitrumSepolia
  const isArbitrumLocal = chainId === ChainId.ArbitrumLocal

  const isBaseMainnet = chainId === ChainId.Base
  const isBaseSepolia = chainId === ChainId.BaseSepolia

  const isEthereumMainnetOrTestnet = isEthereumMainnet || isSepolia || isLocal

  const isArbitrum =
    isArbitrumOne || isArbitrumNova || isArbitrumLocal || isArbitrumSepolia

  const isBase = isBaseMainnet || isBaseSepolia

  const isCoreChain = isEthereumMainnetOrTestnet || isArbitrum
  const isOrbitChain = getIsArbitrumChain(chainId) && !isCoreChain
  const isNonArbitrumNetwork = isBase || isEthereumMainnetOrTestnet

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
    isBase,
    isBaseMainnet,
    // L2 Testnets
    isArbitrumSepolia,
    isBaseSepolia,
    // Orbit chains
    isOrbitChain,
    // General
    isTestnet: isTestnetChain(chainId),
    // Core Chain is a chain category for the UI
    isCoreChain,
    isNonArbitrumNetwork
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

export function isAlchemyChain(chainId: number) {
  const chain = orbitChains[chainId]

  if (typeof chain === 'undefined') {
    return false
  }

  return chain.rpcUrl.toLowerCase().includes('alchemy.com')
}

export function mapCustomChainToNetworkData(chain: ChainWithRpcUrl) {
  // custom chain details need to be added to various objects to make it work with the UI
  //
  // add RPC
  rpcURLs[chain.chainId] = chain.rpcUrl
  // explorer URL
  explorerUrls[chain.chainId] = chain.explorerUrl
}

export function isArbitrumChain(
  chain: BlockNumberReferenceNetwork | ArbitrumNetwork
): chain is ArbitrumNetwork {
  return typeof (chain as ArbitrumNetwork).parentChainId !== 'undefined'
}

function isBlockNumberReferenceNetwork(chain: {
  chainId: number
}): chain is BlockNumberReferenceNetwork {
  return (
    typeof l1Networks[chain.chainId] !== 'undefined' ||
    typeof baseNetworks[chain.chainId] !== 'undefined'
  )
}

export const TELEPORT_ALLOWLIST: { [id: number]: number[] } = {
  [ChainId.Ethereum]: [1380012617, 55244], // Rari, Superposition
  [ChainId.Sepolia]: [1918988905] // RARI Testnet
}

export function getChildChainIds(
  chain: ArbitrumNetwork | BlockNumberReferenceNetwork
) {
  const childChainIds = [
    ...getChildrenForNetwork(chain.chainId).map(chain => chain.chainId),
    ...(TELEPORT_ALLOWLIST[chain.chainId] ?? []) // for considering teleport (L1-L3 transfers) we will get the L3 children of the chain, if present
  ]
  return Array.from(new Set(childChainIds))
}

/**
 * Sorts an array of chain IDs in ascending order (default) but keep core chains on top.
 * This is helpful e.g. when we grab the default chain which is the first chain on top.
 */
export function sortChainIds(chainIds: number[]) {
  return chainIds.sort((a, b) => {
    const { isCoreChain: isCoreChainA } = isNetwork(a)
    const { isCoreChain: isCoreChainB } = isNetwork(b)

    if (isCoreChainA && isCoreChainB) {
      // Both are core chains, sort in ascending order
      return a - b
    } else if (isCoreChainA) {
      // Only A is core chain, it should come first
      return -1
    } else if (isCoreChainB) {
      // Only B is core chain, it should come first
      return 1
    } else {
      // Neither are core chains, sort in ascending order
      return a - b
    }
  })
}

export function getDestinationChainIds(
  chainId: ChainId | number,
  {
    includeLifiEnabledChainPairs = false,
    disableTransfersToNonArbitrumChains = false
  }: {
    includeLifiEnabledChainPairs?: boolean
    disableTransfersToNonArbitrumChains?: boolean
  } = {}
): ChainId[] {
  const chain = getChainByChainId(chainId, {
    includeRootChainsWithoutDestination: includeLifiEnabledChainPairs
  })

  if (!chain) {
    return []
  }

  const parentChainId = isArbitrumChain(chain) ? chain.parentChainId : undefined
  const chainIds = getChildChainIds(chain)

  /**
   * Add parent chain if:
   * - parent is an arbitrum network
   * - parent is a non-arbitrum network and transfers to non-arbitrum chains are not disabled
   */
  if (
    parentChainId &&
    (!isNetwork(parentChainId).isNonArbitrumNetwork ||
      (isNetwork(parentChainId).isNonArbitrumNetwork &&
        !disableTransfersToNonArbitrumChains))
  ) {
    chainIds.push(parentChainId)
  }

  /** Include lifi chains, if flag is on */
  const lifiChainIds = lifiDestinationChainIds[chainId]
  if (includeLifiEnabledChainPairs && lifiChainIds && lifiChainIds.length) {
    chainIds.push(...lifiChainIds)
  }

  /** Disabling transfers to non arbitrum chains, remove non-arbitrum chains */
  if (disableTransfersToNonArbitrumChains) {
    return sortChainIds([
      ...new Set(
        chainIds.filter(chainId => !isNetwork(chainId).isNonArbitrumNetwork)
      )
    ])
  }

  return sortChainIds([...new Set(chainIds)])
}

export function isWithdrawalFromArbSepoliaToSepolia({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}): boolean {
  const { isArbitrumSepolia: isSourceChainArbitrumSepolia } =
    isNetwork(sourceChainId)
  const { isSepolia: isDestinationChainSepolia } = isNetwork(destinationChainId)
  return isSourceChainArbitrumSepolia && isDestinationChainSepolia
}

export function isWithdrawalFromArbOneToEthereum({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}): boolean {
  const { isArbitrumOne: isSourceChainArbitrumOne } = isNetwork(sourceChainId)
  const { isEthereumMainnet: isDestinationChainEthereum } =
    isNetwork(destinationChainId)
  return isSourceChainArbitrumOne && isDestinationChainEthereum
}
