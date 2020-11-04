import kovan from 'media/gifs/l1.gif'
import arb from 'media/gifs/l2.gif'

interface Network {
  chainID: number
  name: string
  isArbitrum?: boolean
  url?: string
  gif?: string
}
interface Networks {
  [id: number]: Network
}

const networks: Networks = {
  44010: {
    chainID: 44010,
    name: 'Private-Geth-Testnet',
    gif: kovan
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
  42: {
    chainID: 42,
    name: 'Kovan',
    url: 'https://api.infura.io/v1/jsonrpc/kovan',
    gif: kovan
  }
}

export const arbNetworkIds = ["215728282823301", "152709604825713"]

export default networks
