import {
  L1Network,
  L2Network,
  ParentChain,
  Chain as ArbitrumSDKChain,
  addCustomNetwork
} from '@arbitrum/sdk'
import {
  l2Networks,
  parentChains
} from '@arbitrum/sdk/dist/lib/dataEntities/networks'

import { loadEnvironmentVariableWithFallback } from './index'

export const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY

if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided')
}

const MAINNET_INFURA_RPC_URL = `https://mainnet.infura.io/v3/${INFURA_KEY}`
const GOERLI_INFURA_RPC_URL = `https://goerli.infura.io/v3/${INFURA_KEY}`

export function getL2ChainIds(l1ChainId: number): ChainId[] {
  if (l1ChainId === ChainId.Mainnet) {
    return [ChainId.ArbitrumOne, ChainId.ArbitrumNova]
  }

  if (l1ChainId === ChainId.Goerli) {
    return [ChainId.ArbitrumGoerli, ChainId.XaiTestnet]
  }

  if (l1ChainId === ChainId.ArbitrumGoerli) {
    return [ChainId.Goerli, ChainId.XaiTestnet]
  }

  if (l1ChainId === ChainId.Local) {
    return [ChainId.ArbitrumLocal]
  }

  return []
}

export enum ChainId {
  // L1
  Mainnet = 1,
  // L1 Testnets
  /**
   * Rinkeby is deprecated, but we are keeping it in order to detect it and point to Goerli instead.
   */
  Rinkeby = 4,
  Goerli = 5,
  Local = 1337,
  Sepolia = 11155111,
  // L2
  ArbitrumOne = 42161,
  ArbitrumNova = 42170,
  // L2 Testnets
  /**
   * Arbitrum Rinkeby is deprecated, but we are keeping it in order to detect it and point to Arbitrum Goerli instead.
   */
  ArbitrumRinkeby = 421611,
  ArbitrumGoerli = 421613,
  ArbitrumLocal = 412346,
  // Orbit
  XaiTestnet = 51204936
}

export const rpcURLs: { [chainId: number]: string } = {
  // L1
  [ChainId.Mainnet]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
    fallback: MAINNET_INFURA_RPC_URL
  }),
  // L1 Testnets
  [ChainId.Goerli]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_GOERLI_RPC_URL,
    fallback: GOERLI_INFURA_RPC_URL
  }),
  // L2
  [ChainId.ArbitrumOne]: 'https://arb1.arbitrum.io/rpc',
  [ChainId.ArbitrumNova]: 'https://nova.arbitrum.io/rpc',
  // L2 Testnets
  [ChainId.ArbitrumGoerli]: 'https://goerli-rollup.arbitrum.io/rpc',
  // L3 Testnets
  [ChainId.XaiTestnet]: 'http://localhost:8449'
}

export const explorerUrls: { [chainId: number]: string } = {
  // L1
  [ChainId.Mainnet]: 'https://etherscan.io',
  // L1 Testnets
  [ChainId.Goerli]: 'https://goerli.etherscan.io',
  // L2
  [ChainId.ArbitrumNova]: 'https://nova.arbiscan.io',
  [ChainId.ArbitrumOne]: 'https://arbiscan.io',
  // L2 Testnets
  [ChainId.ArbitrumGoerli]: 'https://goerli.arbiscan.io',
  // L3 Testnets
  [ChainId.XaiTestnet]: ''
}

export const getExplorerUrl = (chainId: ChainId) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return explorerUrls[chainId] ?? explorerUrls[ChainId.Mainnet]! //defaults to etherscan, can never be null
}

export const getBlockTime = (chainId: ChainId) => {
  const network = parentChains[chainId]
  if (!network) {
    throw new Error(`Couldn't get block time. Unexpected chain ID: ${chainId}`)
  }
  return (network as L1Network).blockTime ?? 10
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
  [ChainId.Mainnet]: [ChainId.ArbitrumOne, ChainId.ArbitrumNova],
  // L1 Testnets
  [ChainId.Goerli]: [ChainId.ArbitrumGoerli],
  // L2
  [ChainId.ArbitrumOne]: [ChainId.ArbitrumOne],
  [ChainId.ArbitrumNova]: [ChainId.ArbitrumNova],
  // L2 Testnets
  [ChainId.ArbitrumGoerli]: [ChainId.XaiTestnet],
  // L3 Testnets
  [ChainId.XaiTestnet]: [ChainId.XaiTestnet]
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
  partnerChainIDs: [],
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
    l1CustomGateway: '0x3DF948c956e14175f43670407d5796b95Bb219D8',
    l1ERC20Gateway: '0x4A2bA922052bA54e29c5417bC979Daaf7D5Fe4f4',
    l1GatewayRouter: '0x525c2aBA45F66987217323E8a05EA400C65D06DC',
    l1MultiCall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
    l1ProxyAdmin: '0xe1080224B632A93951A7CFA33EeEa9Fd81558b5e',
    l1Weth: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
    l1WethGateway: '0xF5FfD11A55AFD39377411Ab9856474D2a7Cb697e',
    l2CustomGateway: '0x525c2aBA45F66987217323E8a05EA400C65D06DC',
    l2ERC20Gateway: '0xe1080224B632A93951A7CFA33EeEa9Fd81558b5e',
    l2GatewayRouter: '0x1294b86822ff4976BfE136cB06CF43eC7FCF2574',
    l2Multicall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
    l2ProxyAdmin: '0xda52b25ddB0e3B9CC393b0690Ac62245Ac772527',
    l2Weth: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
    l2WethGateway: '0x4A2bA922052bA54e29c5417bC979Daaf7D5Fe4f4'
  }
}

const defaultL3Network: ArbitrumSDKChain = {
  chainID: 51204936,
  confirmPeriodBlocks: 150,
  ethBridge: {
    bridge: '0xA0a2bdC2EFAC9714fA5dA3F0e2f0a83c776Dc641',
    inbox: '0x4160D735f4fa8BBD7a6C30bB015a48b74d5a3269',
    outbox: '0xB91eeef09Fdc910F9884EfACb53a3752Ec20Fe79',
    rollup: '0xf35c65050635da8653D58685eC01d1492cc4C8e4',
    sequencerInbox: '0xD75d57942Ee6b4b11A06bae6dAd44837c7c9C15E'
  },
  explorerUrl: '',
  isCustom: true,
  name: 'Bartek',
  partnerChainID: 421613,
  retryableLifetimeSeconds: 604800,
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 900000,
  isArbitrum: true,
  tokenBridge: {
    l1CustomGateway: '0x3FfF6b939cb79df542224fdDfc7C5864396D0C6F',
    l1ERC20Gateway: '0x12192B642565447a759Fb70c68a38Fa07D73168A',
    l1GatewayRouter: '0xe100022aC0505Aa2c20cAea09dFd360BFf9f3D3C',
    l1MultiCall: '0x8dFd97E3475054a266072a70120481d88A390FDC',
    l1ProxyAdmin: '0xFEaf3Df2eD6ddB5B4d1f3934B54a76ac434081B9',
    l1Weth: '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
    l1WethGateway: '0xB87873AcB45Ac42D2A871A977c0C0a55952B79b2',
    l2CustomGateway: '0x5050017503cbDC76185144470A33F08FcDeBefAB',
    l2ERC20Gateway: '0xe9f3E1d892a125ddAbA401C12Cf6c6FD50DD0C1d',
    l2GatewayRouter: '0x5A55B48AE5c90B06dCd412B8b10301b5660e85Cb',
    l2Multicall: '0xF1EbE27e93a9673040408e44734a772300E6a0F0',
    l2ProxyAdmin: '0x1A9932c26a7DDA1ed536ea39e5c5f0c6cE8c6bf3',
    l2Weth: '0x39c17A6cf6fA8F2346734088813c4ad59374D3d9',
    l2WethGateway: '0xb3B15E5b09BbE1C8f6447F78D69020624d88d0D2'
  }
}

export type RegisterLocalNetworkParams = {
  l1Network: L1Network
  l2Network: ParentChain
  l3Network: ArbitrumSDKChain
}

const registerLocalNetworkDefaultParams: RegisterLocalNetworkParams = {
  l1Network: defaultL1Network,
  l2Network: defaultL2Network,
  l3Network: defaultL3Network
}

export const localL1NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL,
  fallback: 'http://localhost:8545'
})
export const localL2NetworkRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL,
  fallback: 'http://localhost:8547'
})
export const localL3NetworkRpcUrl = 'http://localhost:8449'

export function registerLocalNetwork(
  params: RegisterLocalNetworkParams = registerLocalNetworkDefaultParams
) {
  const { l1Network, l2Network, l3Network } = params

  try {
    rpcURLs[l1Network.chainID] = localL1NetworkRpcUrl
    rpcURLs[l2Network.chainID] = localL2NetworkRpcUrl
    rpcURLs[l3Network.chainID] = localL3NetworkRpcUrl

    chainIdToDefaultL2ChainId[l1Network.chainID] = [l2Network.chainID]
    chainIdToDefaultL2ChainId[l2Network.chainID] = [l2Network.chainID]

    addCustomNetwork({
      customL1Network: l1Network,
      customL2Network: l2Network as L2Network
    })
    addCustomNetwork({ customL1Network: l2Network, customL2Network: l3Network })
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

export function isNetwork(chainId: ChainId) {
  const isMainnet = chainId === ChainId.Mainnet

  const isRinkeby = chainId === ChainId.Rinkeby
  const isGoerli = chainId === ChainId.Goerli
  const isSepolia = chainId === ChainId.Sepolia

  const isArbitrumOne = chainId === ChainId.ArbitrumOne
  const isArbitrumNova = chainId === ChainId.ArbitrumNova
  const isArbitrumGoerli = chainId === ChainId.ArbitrumGoerli
  const isArbitrumRinkeby = chainId === ChainId.ArbitrumRinkeby
  const isArbitrumLocal = chainId === ChainId.ArbitrumLocal

  const isXaiTestnet = chainId === ChainId.XaiTestnet
  const isXai = isXaiTestnet
  const isOrbitChain = isXaiTestnet

  const isArbitrum =
    isArbitrumOne ||
    isArbitrumNova ||
    isArbitrumGoerli ||
    isArbitrumRinkeby ||
    isArbitrumLocal

  const isTestnet =
    isRinkeby ||
    isGoerli ||
    isArbitrumGoerli ||
    isArbitrumRinkeby ||
    isSepolia ||
    isXaiTestnet

  const isSupported =
    isArbitrumOne ||
    isArbitrumNova ||
    isMainnet ||
    isGoerli ||
    isArbitrumGoerli ||
    isOrbitChain // is network supported on bridge

  return {
    // L1
    isMainnet,
    isEthereum: !isArbitrum && !isOrbitChain,
    // L1 Testnets
    isRinkeby,
    isGoerli,
    isSepolia,
    // L2
    isArbitrum,
    isArbitrumOne,
    isArbitrumNova,
    // L2 Testnets
    isArbitrumRinkeby,
    isArbitrumGoerli,
    // Orbit
    isOrbitChain,
    isXai,
    // Orbit Testnets
    isXaiTestnet,
    // Testnet
    isTestnet,
    // General
    isSupported
  }
}

export function getNetworkName(chainId: number) {
  switch (chainId) {
    case ChainId.Mainnet:
      return 'Mainnet'

    case ChainId.Goerli:
      return 'Goerli'

    case ChainId.Local:
      return 'Ethereum'

    case ChainId.ArbitrumOne:
      return 'Arbitrum One'

    case ChainId.ArbitrumNova:
      return 'Arbitrum Nova'

    case ChainId.ArbitrumGoerli:
      return 'Arbitrum Goerli'

    case ChainId.ArbitrumLocal:
      return 'Arbitrum'

    case ChainId.XaiTestnet:
      return 'Xai Goerli'

    default:
      return 'Unknown'
  }
}

export function getNetworkLogo(chainId: number) {
  switch (chainId) {
    // L1 networks
    case ChainId.Mainnet:
    case ChainId.Goerli:
      return '/images/EthereumLogo.svg'

    // L2 networks
    case ChainId.ArbitrumOne:
    case ChainId.ArbitrumGoerli:
    case ChainId.ArbitrumLocal:
      return '/images/ArbitrumOneLogo.svg'

    case ChainId.ArbitrumNova:
      return '/images/ArbitrumNovaLogo.svg'

    case ChainId.XaiTestnet:
      return '/images/XaiLogo.svg'

    default:
      return '/images/EthereumLogo.svg'
  }
}

export function getSupportedNetworks(chainId = 0) {
  return isNetwork(chainId).isTestnet
    ? [ChainId.Goerli, ChainId.ArbitrumGoerli, ChainId.XaiTestnet]
    : [ChainId.Mainnet, ChainId.ArbitrumOne, ChainId.ArbitrumNova]
}
