import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'
import {
  l1Networks,
  l2Networks
} from '@arbitrum/sdk/dist/lib/dataEntities/networks'

import { Erc20Data } from './TokenUtils'
import { loadEnvironmentVariableWithFallback } from './index'

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
  nativeTokenData?: Erc20Data
}

export function getBaseChainIdByChainId({
  chainId
}: {
  chainId: number
}): number {
  const chain = l2Networks[chainId]

  if (!chain || !chain.partnerChainID) {
    return chainId
  }

  const parentChain = { ...l1Networks, ...l2Networks }[chain.partnerChainID]

  if (!parentChain) {
    return chainId
  }

  if ('partnerChainID' in parentChain) {
    const parentOfParentChain = parentChain.partnerChainID

    if (parentOfParentChain && typeof parentOfParentChain === 'number') {
      return parentOfParentChain
    }
  }

  return parentChain.chainID ?? chainId
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

function getCustomChainIds(l2ChainID: number): ChainId[] {
  // gets custom chain IDs where l2ChainID matches the partnerChainID
  return getCustomChainsFromLocalStorage()
    .filter(chain => chain.partnerChainID === l2ChainID)
    .map(chain => chain.chainID)
}

export function getL2ChainIds(l1ChainId: number): ChainId[] {
  // Ethereum as the parent chain
  switch (l1ChainId) {
    case ChainId.Ethereum:
      return [ChainId.ArbitrumOne, ChainId.ArbitrumNova, ChainId.Xai]
    case ChainId.ArbitrumOne:
      return [ChainId.Ethereum, ChainId.Xai]
    case ChainId.Goerli:
      return [
        ChainId.ArbitrumGoerli,
        ChainId.XaiTestnet,
        ...getCustomChainIds(ChainId.ArbitrumGoerli)
      ]
    case ChainId.Sepolia:
      return [
        ChainId.ArbitrumSepolia,
        ChainId.StylusTestnet,
        ...getCustomChainIds(ChainId.ArbitrumSepolia)
      ]
    case ChainId.Local:
      return [
        ChainId.ArbitrumLocal,
        ...getCustomChainIds(ChainId.ArbitrumLocal)
      ]
    // Arbitrum as the parent chain
    case ChainId.ArbitrumGoerli:
      return [
        ChainId.Goerli,
        ChainId.XaiTestnet,
        ...getCustomChainIds(ChainId.ArbitrumGoerli)
      ]
    case ChainId.ArbitrumSepolia:
      return [
        ChainId.Sepolia,
        ChainId.StylusTestnet,
        ...getCustomChainIds(ChainId.ArbitrumSepolia)
      ]
    case ChainId.ArbitrumLocal:
      return [ChainId.Local, ...getCustomChainIds(ChainId.ArbitrumLocal)]
    default:
      return []
  }
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
  // Orbit Testnets
  XaiTestnet = 47279324479,
  Xai = 660279,
  StylusTestnet = 23011913
}

export const supportedCustomOrbitParentChains = [
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
  [ChainId.XaiTestnet]: 'https://testnet.xai-chain.net/rpc',
  [ChainId.Xai]: 'https://xai-chain.net/rpc',
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
  [ChainId.XaiTestnet]: 'https://testnet-explorer.xai-chain.net',
  [ChainId.Xai]: 'https://explorer.xai-chain.net',
  [ChainId.StylusTestnet]: 'https://stylus-testnet-explorer.arbitrum.io'
}

export const getExplorerUrl = (chainId: ChainId) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return explorerUrls[chainId] ?? explorerUrls[ChainId.Ethereum]! //defaults to etherscan, can never be null
}

export const getBlockTime = (chainId: ChainId) => {
  const network = l1Networks[chainId] || l2Networks[chainId]
  if (!network) {
    throw new Error(`Couldn't get block time. Unexpected chain ID: ${chainId}`)
  }
  return (network as L1Network).blockTime ?? 12
}

export const getConfirmPeriodBlocks = (chainId: ChainId) => {
  const network = l2Networks[chainId]
  if (!network) {
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

// Default L2 Chain to use for a certain chainId
export const chainIdToDefaultL2ChainId: { [chainId: number]: ChainId[] } = {
  // L1
  [ChainId.Ethereum]: [ChainId.ArbitrumOne, ChainId.ArbitrumNova],
  // L1 Testnets
  [ChainId.Goerli]: [ChainId.ArbitrumGoerli],
  [ChainId.Sepolia]: [ChainId.ArbitrumSepolia],
  // L2
  [ChainId.ArbitrumOne]: [ChainId.ArbitrumOne, ChainId.Xai],
  [ChainId.ArbitrumNova]: [ChainId.ArbitrumNova],
  // L2 Testnets
  [ChainId.ArbitrumGoerli]: [ChainId.ArbitrumGoerli, ChainId.XaiTestnet],
  [ChainId.ArbitrumSepolia]: [ChainId.ArbitrumSepolia, ChainId.StylusTestnet],
  // Orbit Testnets
  [ChainId.XaiTestnet]: [ChainId.XaiTestnet],
  [ChainId.Xai]: [ChainId.Xai],
  [ChainId.StylusTestnet]: [ChainId.StylusTestnet]
}

const defaultL1Network: L1Network = {
  blockTime: 10,
  chainID: 1337,
  explorerUrl: '',
  isCustom: true,
  name: 'EthLocal',
  partnerChainIDs: [412346],
  isArbitrum: false
}

const defaultL2Network: L2Network = {
  chainID: 412346,
  blockTime: 0.25,
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
  name: 'ArbLocal',
  partnerChainID: 1337,
  retryableLifetimeSeconds: 604800,
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 900000,
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

export const xaiTestnet: L2Network = {
  chainID: 47279324479,
  blockTime: 0.25,
  partnerChainIDs: [],
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0xf958e56d431eA78C7444Cf6A6184Af732Ae6a8A3',
    inbox: '0x8b842ad88AAffD63d52EC54f6428fb7ff83060a8',
    outbox: '0xDfe36Bea935F11260b0159dCA255b6668925d743',
    rollup: '0x082742561295f6e1b43c4f5d1e2d52d7FfE082f1',
    sequencerInbox: '0x5fD0cCc5D31748A44b43cf8DFBFA0FAA32665464'
  },
  explorerUrl: 'https://testnet-explorer.xai-chain.net',
  isArbitrum: true,
  isCustom: true,
  name: 'Xai Orbit Testnet',
  partnerChainID: 421613,
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    l1CustomGateway: '0xdBbDc3EE848C05792CC93EA140c59731f920c3F2',
    l1ERC20Gateway: '0xC033fBAFd978440460d943efe6A3bF6A1a990e80',
    l1GatewayRouter: '0xCb0Fe28c36a60Cf6254f4dd74c13B0fe98FFE5Db',
    l1MultiCall: '0x21779e0950A87DDD57E341d54fc12Ab10F6eE167',
    l1ProxyAdmin: '0xc80853e91f8Ac0AaD6ff939F3861600Ab34Dfe12',
    l1Weth: '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
    l1WethGateway: '0x58ea20BE21b971Fa282905EdA74bA46540eEd977',
    l2CustomGateway: '0xc60622D1FbDD63Cf9c173D1b69715Ef2B725D792',
    l2ERC20Gateway: '0x47ab2DfD627360fC6ac4Ae2fB9fa6f3539aFfeCc',
    l2GatewayRouter: '0x75c2848D0B2116d6832Ff3758df09D4209b4b7ce',
    l2Multicall: '0xE2fBe979bD0df59554Fded36f3A3BF5206f287a2',
    l2ProxyAdmin: '0x81DeEc20158a367f7039ab3a563C1eB63cc2b3D6',
    l2Weth: '0xea77c06A6703A781f9442EFa083e21F3F75907F8',
    l2WethGateway: '0x927b59cCde7a92acDa085514FdEA39f0c4D1a2DC'
  },
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 1800000
}

export const xai: L2Network = {
  chainID: ChainId.Xai,
  blockTime: 0.25,
  partnerChainIDs: [],
  confirmPeriodBlocks: 45818,
  ethBridge: {
    bridge: '0x7dd8A76bdAeBE3BBBaCD7Aa87f1D4FDa1E60f94f',
    inbox: '0xaE21fDA3de92dE2FDAF606233b2863782Ba046F9',
    outbox: '0x1E400568AD4840dbE50FB32f306B842e9ddeF726',
    rollup: '0xC47DacFbAa80Bd9D8112F4e8069482c2A3221336',
    sequencerInbox: '0x995a9d3ca121D48d21087eDE20bc8acb2398c8B1'
  },
  nativeToken: '0x4Cb9a7AE498CEDcBb5EAe9f25736aE7d428C9D66',
  explorerUrl: 'https://explorer.xai-chain.net',
  isArbitrum: true,
  isCustom: true,
  name: 'Xai',
  partnerChainID: ChainId.ArbitrumOne,
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    l1CustomGateway: '0xb15A0826d65bE4c2fDd961b72636168ee70Af030',
    l1ERC20Gateway: '0xb591cE747CF19cF30e11d656EB94134F523A9e77',
    l1GatewayRouter: '0x22CCA5Dc96a4Ac1EC32c9c7C5ad4D66254a24C35',
    l1MultiCall: '0x842eC2c7D803033Edf55E478F461FC547Bc54EB2',
    l1ProxyAdmin: '0x041f85dd87c46b941dc9b15c6628b19ee5358485',
    l1Weth: '0x0000000000000000000000000000000000000000',
    l1WethGateway: '0x0000000000000000000000000000000000000000',
    l2CustomGateway: '0x96551194230725c72ACF8E9573B1382CCBC70635',
    l2ERC20Gateway: '0x0c71417917D24F4A6A6A55559B98c5cCEcb33F7a',
    l2GatewayRouter: '0xd096e8dE90D34de758B0E0bA4a796eA2e1e272cF',
    l2Multicall: '0xEEC168551A85911Ec3A905e0561b656979f3ea67',
    l2ProxyAdmin: '0x56800fDCFbE19Ea3EE9d115dAC30d95d6459c44E',
    l2Weth: '0x0000000000000000000000000000000000000000',
    l2WethGateway: '0x0000000000000000000000000000000000000000'
  },
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 1800000
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

    chainIdToDefaultL2ChainId[l1Network.chainID] = [l2Network.chainID]
    chainIdToDefaultL2ChainId[l2Network.chainID] = [l2Network.chainID]

    addCustomNetwork({ customL1Network: l1Network, customL2Network: l2Network })
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

export function isNetwork(chainId: ChainId) {
  const customChains = getCustomChainsFromLocalStorage()

  const isEthereumMainnet = chainId === ChainId.Ethereum

  const isGoerli = chainId === ChainId.Goerli
  const isSepolia = chainId === ChainId.Sepolia
  const isLocal = chainId === ChainId.Local

  const isArbitrumOne = chainId === ChainId.ArbitrumOne
  const isArbitrumNova = chainId === ChainId.ArbitrumNova
  const isArbitrumGoerli = chainId === ChainId.ArbitrumGoerli
  const isArbitrumSepolia = chainId === ChainId.ArbitrumSepolia
  const isArbitrumLocal = chainId === ChainId.ArbitrumLocal

  const isXai = chainId === ChainId.Xai

  const isXaiTestnet = chainId === ChainId.XaiTestnet
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

  const isTestnet =
    isGoerli ||
    isLocal ||
    isArbitrumGoerli ||
    isSepolia ||
    isArbitrumSepolia ||
    isXaiTestnet ||
    isStylusTestnet ||
    isCustomOrbitChain

  const isSupported =
    isArbitrumOne ||
    isArbitrumNova ||
    isEthereumMainnet ||
    isGoerli ||
    isArbitrumGoerli ||
    isSepolia ||
    isArbitrumSepolia ||
    isStylusTestnet ||
    isXai ||
    isXaiTestnet // is network supported on bridge

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
    isOrbitChain: !isEthereumMainnetOrTestnet && !isArbitrum,
    isXai,
    isXaiTestnet,
    isStylusTestnet,
    // Testnet
    isTestnet,
    // General
    isSupported
  }
}

export function getNetworkName(chainId: number) {
  const customChain = getCustomChainFromLocalStorageById(chainId)

  if (customChain) {
    return customChain.name
  }

  switch (chainId) {
    case ChainId.Ethereum:
      return 'Ethereum'

    case ChainId.Goerli:
      return 'Goerli'

    case ChainId.Sepolia:
      return 'Sepolia'

    case ChainId.Local:
      return 'Ethereum'

    case ChainId.ArbitrumOne:
      return 'Arbitrum One'

    case ChainId.ArbitrumNova:
      return 'Arbitrum Nova'

    case ChainId.ArbitrumGoerli:
      return 'Arbitrum Goerli'

    case ChainId.ArbitrumSepolia:
      return 'Arbitrum Sepolia'

    case ChainId.ArbitrumLocal:
      return 'Arbitrum'

    case ChainId.XaiTestnet:
      return 'Xai Testnet'

    case ChainId.Xai:
      return 'Xai'

    case ChainId.StylusTestnet:
      return 'Stylus Testnet'

    default:
      return 'Unknown'
  }
}

export function getNetworkLogo(
  chainId: number,
  variant: 'light' | 'dark' = 'dark'
) {
  switch (chainId) {
    // L1 networks
    case ChainId.Ethereum:
    case ChainId.Goerli:
    case ChainId.Sepolia:
      return '/images/EthereumLogo.svg'

    // L2 networks
    case ChainId.ArbitrumOne:
      return '/images/ArbitrumOneLogo.svg'

    case ChainId.ArbitrumGoerli:
    case ChainId.ArbitrumSepolia:
    case ChainId.ArbitrumLocal:
      return '/images/ArbitrumLogo.svg'

    case ChainId.ArbitrumNova:
      return '/images/ArbitrumNovaLogo.svg'

    case ChainId.XaiTestnet:
    case ChainId.Xai:
      return '/images/XaiLogo.svg'

    case ChainId.StylusTestnet:
      return '/images/StylusLogo.svg'

    default:
      const { isArbitrum, isOrbitChain } = isNetwork(chainId)
      if (isArbitrum) {
        return '/images/ArbitrumOneLogo.svg'
      }
      if (isOrbitChain) {
        return variant === 'dark'
          ? '/images/OrbitLogo.svg'
          : '/images/OrbitLogoWhite.svg'
      }
      return '/images/EthereumLogo.svg'
  }
}

export function getSupportedNetworks(chainId = 0, includeTestnets = false) {
  const testnetNetworks = [
    ChainId.Goerli,
    ChainId.ArbitrumGoerli,
    ChainId.Sepolia,
    ChainId.ArbitrumSepolia,
    ChainId.XaiTestnet,
    ChainId.StylusTestnet,
    ...getCustomChainsFromLocalStorage().map(chain => chain.chainID)
  ]

  const mainnetNetworks = [
    ChainId.Ethereum,
    ChainId.ArbitrumOne,
    ChainId.ArbitrumNova,
    ChainId.Xai
  ]

  return isNetwork(chainId).isTestnet
    ? [...mainnetNetworks, ...testnetNetworks]
    : [...mainnetNetworks, ...(includeTestnets ? testnetNetworks : [])]
}

export function mapCustomChainToNetworkData(chain: ChainWithRpcUrl) {
  // custom chain details need to be added to various objects to make it work with the UI
  //
  // update default L2 Chain ID; it allows us to pair the Chain with its Parent Chain
  chainIdToDefaultL2ChainId[chain.partnerChainID] = [
    ...(chainIdToDefaultL2ChainId[chain.partnerChainID] ?? []),
    chain.chainID
  ]
  // also set Chain's default chain to point to its own chain ID
  chainIdToDefaultL2ChainId[chain.chainID] = [
    ...(chainIdToDefaultL2ChainId[chain.chainID] ?? []),
    chain.chainID
  ]
  // add RPC
  rpcURLs[chain.chainID] = chain.rpcUrl
  // explorer URL
  explorerUrls[chain.chainID] = chain.explorerUrl
}
