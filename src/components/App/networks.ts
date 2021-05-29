import kovan from 'media/gifs/l1.gif'
import arb from 'media/gifs/l2.gif'

interface Network {
  chainID: number
  name: string
  isArbitrum?: boolean
  url: string
  gif?: string
  confirmPeriodBlocks?: number
}
interface Networks {
  [id: number]: Network
}

const networks: Networks = {
  44010: {
    chainID: 44010,
    name: 'Private-Geth-Testnet',
    gif: kovan,
    url: ""
  },
  212984383488152:{
    chainID: 212984383488152,
    name: 'Arbitrum-testnet-4',
    gif: arb,
    isArbitrum: true,
    url: "https://kovan4.arbitrum.io/rpc"
  },
  144545313136048:{
    chainID: 144545313136048,
    name: 'Arbitrum-testnet-5',
    gif: arb,
    isArbitrum: true,
    url: "https://kovan5.arbitrum.io/rpc",
    confirmPeriodBlocks: 900
  },
  215728282823301: {
    chainID: 215728282823301,
    name: 'Arbitrum-testnet',
    gif: arb,
    isArbitrum: true,
    url: "https://node.offchainlabs.com:8547"
  },
  152709604825713: {
    chainID: 152709604825713,
    name: 'Arbitrum-testnet',
    gif: arb,
    isArbitrum: true,
    url: "https://kovan2.arbitrum.io/rpc"
  },
  79377087078960: {
    chainID: 79377087078960,
    name: "Arbitrum-testnet3",
    gif: arb,
    isArbitrum: true,
    url: "https://kovan3.arbitrum.io/rpc"
  },
  42: {
    chainID: 42,
    name: 'Kovan',
    url: 'https://api.infura.io/v1/jsonrpc/kovan',
    gif: kovan
  },
  1: {
    chainID: 1,
    name: 'Mainnet',
    url: 'https://mainnet.infura.io/v3/8838d00c028a46449be87e666387c71a',
    gif: kovan
  },
  42161: {
    chainID: 42161,
    name: 'Arb1',
    url: 'https://arb1.arbitrum.io/rpc',
    gif: kovan
  }
}

export const arbNetworkIds = ["215728282823301", "152709604825713", "79377087078960", "212984383488152","144545313136048", "42161"]

export default networks
