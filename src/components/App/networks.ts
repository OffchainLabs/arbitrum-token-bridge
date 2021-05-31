import kovan from 'media/gifs/l1.gif'
import arb from 'media/gifs/l2.gif'

const INFURA_KEY = process.env.REACT_APP_INFURA_KEY as string;

if(!INFURA_KEY){
  throw new Error("Infura API key not provided")
}



// TODO: cache by network only
// TODO: confirm period blocks (for mainnet)
// cache current tab
// networks switching hting
// todo brdige tokens bug thing 

export interface Network {
  chainID: string
  name: string
  isArbitrum: boolean
  url: string
  gif?: string
  confirmPeriodBlocks?: number
  explorerUrl: string
  partnerChainID: string,
  tokenBridge: TokenBridge
}

interface TokenBridge {
  l1Address: string,
  l2Address: string
}

interface Networks {
  [id: string]: Network
}


const mainnetBridge: TokenBridge = {
  l1Address: "0x819702D5069736510fB53c48803128a8DC23E1Af",
  l2Address: "0xdE290B3BAB9d636C2a84d15C8EC13Ba0001a6641"
}

const kovan5Bridge: TokenBridge =  {
  l1Address: "0x1d750369c91b129524B68f308512b0FE2C903d71",
  l2Address: "0x2EEBB8EE9c377caBC476654ca4aba016ECA1B9fc"

}


const networks: Networks = {
  "42": {
    chainID: "42",
    name: 'Kovan',
    url: 'https://kovan.infura.io/v3/' + INFURA_KEY,
    gif: kovan,
    explorerUrl:"https://kovan.etherscan.io",
    partnerChainID: "144545313136048",
    isArbitrum: false,
    tokenBridge: kovan5Bridge
  },
  "144545313136048":{
    chainID: "144545313136048",
    name: 'Arbitrum-testnet-5',
    gif: arb,
    isArbitrum: true,
    url: "https://kovan5.arbitrum.io/rpc",
    explorerUrl: "https://explorer5.arbitrum.io/#",
    confirmPeriodBlocks: 900,
    partnerChainID: "42",
    tokenBridge: kovan5Bridge
  },
  "1": {
    chainID: "1",
    name: 'Mainnet',
    url: 'https://mainnet.infura.io/v3/' + INFURA_KEY,
    gif: kovan,
    explorerUrl: "https://etherscan.io",
    isArbitrum: false,
    partnerChainID: "42161",
    tokenBridge: mainnetBridge

  },
  "42161": {
    chainID: "42161",
    name: 'Arb1',
    url: 'https://arb1.arbitrum.io/rpc',
    gif: kovan,
    explorerUrl: "https://mainnet-arb-explorer.netlify.app",
    partnerChainID: "1",
    isArbitrum: true,
    tokenBridge: mainnetBridge

  }
}


export default networks
