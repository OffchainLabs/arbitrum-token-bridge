import kovan from 'media/gifs/l1.gif'
import arb from 'media/gifs/l2.gif'

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
  confirmPeriodBlocks?: number
  blockTime?: number //seconds
}

interface TokenBridge {
  l1Address: string
  l2Address: string
}

interface Networks {
  [id: string]: Network
}


export const MAINNET_WHITELIST_ADDRESS= "0xD485e5c28AA4985b23f6DF13dA03caa766dcd459"

const mainnetBridge: TokenBridge = {
  l1Address: '0x6074515Bc580C76c0C68AE2E13408B680d670F8C',
  l2Address: '0x29f86A78551Fac44217A8763A45540027c3F7cA5'
}

const kovan5Bridge: TokenBridge = {
  l1Address: '0x1d750369c91b129524B68f308512b0FE2C903d71',
  l2Address: '0x2EEBB8EE9c377caBC476654ca4aba016ECA1B9fc'
}

const RinkebyBridge: TokenBridge = {
  l1Address: '0x70C143928eCfFaf9F5b406f7f4fC28Dc43d68380',
  l2Address: '0x9413AD42910c1eA60c737dB5f58d1C504498a3cD'
}

const networks: Networks = {
  '42': {
    chainID: '42',
    name: 'Kovan',
    url: 'https://kovan.infura.io/v3/' + INFURA_KEY,
    gif: kovan,
    explorerUrl: 'https://kovan.etherscan.io',
    partnerChainID: '144545313136048',
    isArbitrum: false,
    tokenBridge: kovan5Bridge,
    blockTime: 5
  },
  '144545313136048': {
    chainID: '144545313136048',
    name: 'Arbitrum-testnet-5',
    gif: arb,
    isArbitrum: true,
    url: 'https://kovan5.arbitrum.io/rpc',
    explorerUrl: 'https://explorer5.arbitrum.io/#',
    confirmPeriodBlocks: 900,
    partnerChainID: '42',
    tokenBridge: kovan5Bridge
  },
  '1': {
    chainID: '1',
    name: 'Mainnet',
    url: 'https://mainnet.infura.io/v3/' + INFURA_KEY,
    gif: kovan,
    explorerUrl: 'https://etherscan.io',
    isArbitrum: false,
    partnerChainID: '42161',
    tokenBridge: mainnetBridge,
    blockTime: 15,
  },
  '42161': {
    chainID: '42161',
    name: 'Arb1',
    url: 'https://arb1.arbitrum.io/rpc',
    gif: kovan,
    explorerUrl: 'https://mainnet-arb-explorer.netlify.app',
    partnerChainID: '1',
    isArbitrum: true,
    tokenBridge: mainnetBridge,
    confirmPeriodBlocks: 45818
  },
  '421611':{
    chainID: '421611',
    name: 'ArbRinkeby',
    url: 'https://rinkeby.arbitrum.io/rpc',
    gif: kovan,
    explorerUrl: 'https://rinkeby-explorer.arbitrum.io/',
    partnerChainID: '4',
    isArbitrum: true,
    tokenBridge: RinkebyBridge,
    confirmPeriodBlocks: 6545 // TODO
  },
  '4':{
    chainID: '4',
    name: 'Rinkeby',
    url: 'https://rinkeby.infura.io/v3/' + INFURA_KEY,
    gif: kovan,
    explorerUrl: 'https://rinkeby.etherscan.io',
    partnerChainID: '421611',
    isArbitrum: false,
    tokenBridge: RinkebyBridge,
    confirmPeriodBlocks: 6545  // TODO
  }
}

export default networks
