const INFURA_KEY = process.env.REACT_APP_INFURA_KEY as string

if (!INFURA_KEY) {
  throw new Error('Infura API key not provided')
}

export interface Network {
  chainID: string
  name: string
  isArbitrum: boolean
  url: string
  explorerUrl: string
  partnerChainID: string
  tokenBridge: TokenBridge
  gif?: string
  blockTime?: number // seconds
  bridgeUpdateBlockNumber?: number
}

interface TokenBridge {
  l1Address: string
  l2Address: string
}

interface Networks {
  [id: string]: Network
}

export const MAINNET_WHITELIST_ADDRESS =
  '0xD485e5c28AA4985b23f6DF13dA03caa766dcd459'

const mainnetBridge: TokenBridge = {
  l1Address: '0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef',
  l2Address: '0x5288c571Fd7aD117beA99bF60FE0846C4E84F933'
}

const kovan5Bridge: TokenBridge = {
  l1Address: '0x1d750369c91b129524B68f308512b0FE2C903d71',
  l2Address: '0x2EEBB8EE9c377caBC476654ca4aba016ECA1B9fc'
}

const RinkebyBridge: TokenBridge = {
  l1Address: '0x70C143928eCfFaf9F5b406f7f4fC28Dc43d68380',
  l2Address: '0x9413AD42910c1eA60c737dB5f58d1C504498a3cD'
}

const kovanGif = '/images/l1.gif'
const networks: Networks = {
  '42': {
    chainID: '42',
    name: 'Kovan',
    url: `https://kovan.infura.io/v3/${INFURA_KEY}`,
    gif: kovanGif,
    explorerUrl: 'https://kovan.etherscan.io',
    partnerChainID: '144545313136048',
    isArbitrum: false,
    tokenBridge: kovan5Bridge,
    blockTime: 5
  },
  '144545313136048': {
    chainID: '144545313136048',
    name: 'Arbitrum-testnet-5',
    gif: '/images/l2.gif',
    isArbitrum: true,
    url: 'https://kovan5.arbitrum.io/rpc',
    explorerUrl: 'https://explorer5.arbitrum.io/#',
    partnerChainID: '42',
    tokenBridge: kovan5Bridge
  },
  '1': {
    chainID: '1',
    name: 'Mainnet',
    url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    gif: kovanGif,
    explorerUrl: 'https://etherscan.io',
    isArbitrum: false,
    partnerChainID: '42161',
    tokenBridge: mainnetBridge,
    blockTime: 15
  },
  '42161': {
    chainID: '42161',
    name: 'Arbitrum One',
    url: 'https://arb1.arbitrum.io/rpc',
    gif: kovanGif,
    explorerUrl: 'https://arbiscan.io',
    partnerChainID: '1',
    isArbitrum: true,
    tokenBridge: mainnetBridge,
    bridgeUpdateBlockNumber: 224717
  },
  '421611': {
    chainID: '421611',
    name: 'RinkArby',
    url: 'https://rinkeby.arbitrum.io/rpc',
    gif: kovanGif,
    explorerUrl: 'https://testnet.arbiscan.io',
    partnerChainID: '4',
    isArbitrum: true,
    tokenBridge: RinkebyBridge,
    bridgeUpdateBlockNumber: 2386243
  },
  '4': {
    chainID: '4',
    name: 'Rinkeby',
    url: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
    gif: kovanGif,
    explorerUrl: 'https://rinkeby.etherscan.io',
    partnerChainID: '421611',
    isArbitrum: false,
    tokenBridge: RinkebyBridge,
  }
}

export default networks
