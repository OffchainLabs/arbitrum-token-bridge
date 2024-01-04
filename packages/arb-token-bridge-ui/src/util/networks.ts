import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'
import {
  Chain,
  ParentChain,
  l2Networks,
  chains,
  parentChains,
  addCustomChain
} from '@arbitrum/sdk/dist/lib/dataEntities/networks'

import { loadEnvironmentVariableWithFallback } from './index'
import { Erc20Data } from './TokenUtils'

export const customChainLocalStorageKey = 'arbitrum:custom:chains'

export const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY

if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided')
}

const MAINNET_INFURA_RPC_URL = `https://mainnet.infura.io/v3/${INFURA_KEY}`
const GOERLI_INFURA_RPC_URL = `https://goerli.infura.io/v3/${INFURA_KEY}`
const SEPOLIA_INFURA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`

export type ChainWithRpcUrl = Chain & {
  rpcUrl: string
  nativeTokenData?: Erc20Data
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
      // filter again in case local storage is compromized
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
      return [ChainId.ArbitrumOne, ChainId.ArbitrumNova, ChainId.Parallel]
    case ChainId.Goerli:
      return [
        ChainId.ParallelTestnet,
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
  StylusTestnet = 23011913,

  //Parallel
  ParallelTestnet = 2982896226593698,
  Parallel = 1024
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
  [ChainId.StylusTestnet]: 'https://stylus-testnet.arbitrum.io/rpc',

  [ChainId.Parallel]: 'https://rpc.parallel.fi',
  [ChainId.ParallelTestnet]:
    'https://rpc-surprised-harlequin-bonobo-fvcy2k9oqh.t.conduit.xyz'
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
  [ChainId.StylusTestnet]: 'https://stylus-testnet-explorer.arbitrum.io',

  [ChainId.Parallel]: 'https://explorer.parallel.fi',
  [ChainId.ParallelTestnet]:
    'https://explorerl2new-surprised-harlequin-bonobo-fvcy2k9oqh.t.conduit.xyz'
}

export const getExplorerUrl = (chainId: ChainId) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return explorerUrls[chainId] ?? explorerUrls[ChainId.Ethereum]! //defaults to etherscan, can never be null
}

export const getBlockTime = (chainId: ChainId) => {
  const network = parentChains[chainId]
  if (!network) {
    throw new Error(`Couldn't get block time. Unexpected chain ID: ${chainId}`)
  }
  return (network as L1Network).blockTime ?? 12
}

export const getConfirmPeriodBlocks = (chainId: ChainId) => {
  const network = l2Networks[chainId] || chains[chainId]
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
  [ChainId.Ethereum]: [
    ChainId.ArbitrumOne,
    ChainId.ArbitrumNova,
    ChainId.Parallel
  ],
  // L1 Testnets
  [ChainId.Goerli]: [ChainId.ArbitrumGoerli],
  [ChainId.Sepolia]: [ChainId.ArbitrumSepolia],
  // L2
  [ChainId.ArbitrumOne]: [ChainId.ArbitrumOne],
  [ChainId.ArbitrumNova]: [ChainId.ArbitrumNova],
  [ChainId.Parallel]: [ChainId.Parallel],
  // L2 Testnets
  [ChainId.ArbitrumGoerli]: [ChainId.ArbitrumGoerli, ChainId.XaiTestnet],
  [ChainId.ArbitrumSepolia]: [ChainId.ArbitrumSepolia, ChainId.StylusTestnet],
  [ChainId.ParallelTestnet]: [ChainId.ParallelTestnet],
  // Orbit Testnets
  [ChainId.XaiTestnet]: [ChainId.XaiTestnet],
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

const defaultL2Network: ParentChain = {
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

export const xaiTestnet: Chain = {
  chainID: 47279324479,
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

export const parallelTestnet: Chain = {
  chainID: ChainId.ParallelTestnet,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0x58b372C1903F5bcc568c5c86891cEbeb767a2c31', // from "coreContracts.bridge"
    inbox: '0x31c57Fb8a5F73Ba157eD7Ba995170d3c7039dF67', // from "coreContracts.inbox"
    outbox: '0x902F4883fb2852fac77c0bF951eBde4ad7976a0C', // from "coreContracts.outbox"
    rollup: '0x753F9B3e9F93f058519D868052d8C91BED0F9000', // from "coreContracts.rollup"
    sequencerInbox: '0x696Cf54bEEC2Ed0a0D8f5810f41b7E0593B35cd6' // from "coreContracts.sequencerInbox"
  },
  explorerUrl:
    'https://explorerl2new-surprised-harlequin-bonobo-fvcy2k9oqh.t.conduit.xyz',
  isArbitrum: true,
  isCustom: true,
  name: 'Parallel Testnet',
  partnerChainID: 42161, // from "chainInfo.parentChainId"
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    l1CustomGateway: '0x626dec785C672A488C1d195EF9ff5B951Cee3EA9', // from "tokenBridgeContracts.l2Contracts.customGateway"
    l1ERC20Gateway: '0xc8c0485e335e8f263038fc5A0Ba5744Fb22A6D7A', // from "tokenBridgeContracts.l2Contracts.standardGateway"
    l1GatewayRouter: '0x6F00031B0C5A131dd02Dc56Ff649D34d4D2f159d', // from "tokenBridgeContracts.l2Contracts.router"
    l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822', // from "tokenBridgeContracts.l2Contracts.multicall"
    l1ProxyAdmin: '0x5745FB3E541Ab3339Bd8E44120d8f4a1aC412C45', // from "tokenBridgeContracts.l2Contracts.proxyAdmin"
    l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // from "tokenBridgeContracts.l2Contracts.weth"
    l1WethGateway: '0xD2982b7F1a0A8DC358615973C582e1Fe6Aa47151', // from "tokenBridgeContracts.l2Contracts.wethGateway"
    l2CustomGateway: '0xBa909c567C7bCb21D19f542646e8d2fEFdA2Ab92', // from "tokenBridgeContracts.l3Contracts.customGateway"
    l2ERC20Gateway: '0x4b07ed8C2632294dC8B474269C09bC13536EFD30', // from "tokenBridgeContracts.l3Contracts.standardGateway"
    l2GatewayRouter: '0x7E76F1ef0f47FB92262b5Ef8De93e3e2175C1c54', // from "tokenBridgeContracts.l3Contracts.router"
    l2Multicall: '0x3da780AD9D84218d34441cb2DcB30d1924a61B28', // from "tokenBridgeContracts.l3Contracts.multicall"
    l2ProxyAdmin: '0x7CDb2411FF668915A94682e0ba0CEffCf4c157b7', // from "tokenBridgeContracts.l3Contracts.proxyAdmin"
    l2Weth: '0xe0f66fa781837eBcb3f9DFA037BB3Be5fEA9e255', // from "tokenBridgeContracts.l3Contracts.weth"
    l2WethGateway: '0xC28CD1646B7b291Bbad95E172f3952Fa68fEb650' // from "tokenBridgeContracts.l3Contracts.wethGateway"
  },
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 1800000
}

export const parallel: Chain = {
  chainID: ChainId.Parallel,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0x58b372C1903F5bcc568c5c86891cEbeb767a2c31', // from "coreContracts.bridge"
    inbox: '0x31c57Fb8a5F73Ba157eD7Ba995170d3c7039dF67', // from "coreContracts.inbox"
    outbox: '0x902F4883fb2852fac77c0bF951eBde4ad7976a0C', // from "coreContracts.outbox"
    rollup: '0x753F9B3e9F93f058519D868052d8C91BED0F9000', // from "coreContracts.rollup"
    sequencerInbox: '0x696Cf54bEEC2Ed0a0D8f5810f41b7E0593B35cd6' // from "coreContracts.sequencerInbox"
  },
  explorerUrl: 'https://scan.insapce.network',
  isArbitrum: true,
  isCustom: true,
  name: 'Parallel',
  partnerChainID: 42161, // from "chainInfo.parentChainId"
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    l1CustomGateway: '0x626dec785C672A488C1d195EF9ff5B951Cee3EA9', // from "tokenBridgeContracts.l2Contracts.customGateway"
    l1ERC20Gateway: '0xc8c0485e335e8f263038fc5A0Ba5744Fb22A6D7A', // from "tokenBridgeContracts.l2Contracts.standardGateway"
    l1GatewayRouter: '0x6F00031B0C5A131dd02Dc56Ff649D34d4D2f159d', // from "tokenBridgeContracts.l2Contracts.router"
    l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822', // from "tokenBridgeContracts.l2Contracts.multicall"
    l1ProxyAdmin: '0x5745FB3E541Ab3339Bd8E44120d8f4a1aC412C45', // from "tokenBridgeContracts.l2Contracts.proxyAdmin"
    l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // from "tokenBridgeContracts.l2Contracts.weth"
    l1WethGateway: '0xD2982b7F1a0A8DC358615973C582e1Fe6Aa47151', // from "tokenBridgeContracts.l2Contracts.wethGateway"
    l2CustomGateway: '0xBa909c567C7bCb21D19f542646e8d2fEFdA2Ab92', // from "tokenBridgeContracts.l3Contracts.customGateway"
    l2ERC20Gateway: '0x4b07ed8C2632294dC8B474269C09bC13536EFD30', // from "tokenBridgeContracts.l3Contracts.standardGateway"
    l2GatewayRouter: '0x7E76F1ef0f47FB92262b5Ef8De93e3e2175C1c54', // from "tokenBridgeContracts.l3Contracts.router"
    l2Multicall: '0x3da780AD9D84218d34441cb2DcB30d1924a61B28', // from "tokenBridgeContracts.l3Contracts.multicall"
    l2ProxyAdmin: '0x7CDb2411FF668915A94682e0ba0CEffCf4c157b7', // from "tokenBridgeContracts.l3Contracts.proxyAdmin"
    l2Weth: '0xe0f66fa781837eBcb3f9DFA037BB3Be5fEA9e255', // from "tokenBridgeContracts.l3Contracts.weth"
    l2WethGateway: '0xC28CD1646B7b291Bbad95E172f3952Fa68fEb650' // from "tokenBridgeContracts.l3Contracts.wethGateway"
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
  try {
    addCustomChain({ customParentChain: l1Network, customChain: l2Network })
  } catch (error: any) {
    //
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

  const isXaiTestnet = chainId === ChainId.XaiTestnet
  const isStylusTestnet = chainId === ChainId.StylusTestnet
  const isParallel = chainId === ChainId.Parallel
  const isParallelTestnet = chainId === ChainId.ParallelTestnet

  const isEthereumMainnetOrTestnet =
    isEthereumMainnet || isGoerli || isSepolia || isLocal

  const isArbitrum =
    isArbitrumOne ||
    isArbitrumNova ||
    isArbitrumGoerli ||
    isArbitrumLocal ||
    isArbitrumSepolia ||
    isParallel

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
    isCustomOrbitChain ||
    isParallelTestnet

  const isSupported =
    isArbitrumOne ||
    isArbitrumNova ||
    isEthereumMainnet ||
    isGoerli ||
    isArbitrumGoerli ||
    isSepolia ||
    isArbitrumSepolia ||
    isStylusTestnet ||
    isXaiTestnet ||
    isParallel ||
    isParallelTestnet // is network supported on bridge

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
    isParallel,
    // L2 Testnets
    isArbitrumGoerli,
    isArbitrumSepolia,
    isParallelTestnet,
    // Orbit chains
    isOrbitChain: !isEthereumMainnetOrTestnet && !isArbitrum,
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

    case ChainId.StylusTestnet:
      return 'Stylus Testnet'

    case ChainId.Parallel:
      return 'Parallel'

    case ChainId.ParallelTestnet:
      return 'Parallel Testnet'

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
      return '/images/XaiLogo.svg'

    case ChainId.StylusTestnet:
      return '/images/StylusLogo.svg'

    case ChainId.Parallel:
    case ChainId.ParallelTestnet:
      return '/images/ParallelLogo.svg'

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
    ChainId.ParallelTestnet,
    ...getCustomChainsFromLocalStorage().map(chain => chain.chainID)
  ]

  const mainnetNetworks = [
    ChainId.Ethereum,
    ChainId.ArbitrumOne,
    ChainId.ArbitrumNova,
    ChainId.Parallel
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
