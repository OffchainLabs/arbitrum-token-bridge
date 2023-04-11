import { Chain } from 'wagmi'
import { ChainId, rpcURLs } from './networks'

export const localL1Network: Chain = {
  id: ChainId.Local,
  name: 'EthLocal',
  network: 'local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.Local]!]
    },
    public: {
      http: [rpcURLs[ChainId.Local]!]
    }
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: '' }
  }
} as Chain

export const localL2Network = {
  id: ChainId.ArbitrumLocal,
  name: 'ArbLocal',
  network: 'arbitrum-local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.ArbitrumLocal]!]
    },
    public: {
      http: [rpcURLs[ChainId.ArbitrumLocal]!]
    }
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: '' }
  }
}
