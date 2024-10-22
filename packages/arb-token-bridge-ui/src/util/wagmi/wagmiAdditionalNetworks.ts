import { Chain, sepolia as sepoliaDefault } from 'wagmi'

import { ether } from '../../constants'
import { ChainId, ChainWithRpcUrl, explorerUrls, rpcURLs } from '../networks'
import { getBridgeUiConfigForChain } from '../bridgeUiConfig'

export function chainToWagmiChain(chain: ChainWithRpcUrl): Chain {
  let { nativeTokenData } = getBridgeUiConfigForChain(chain.chainId)

  if (chain.chainId === ChainId.L3Local) {
    nativeTokenData = chain.nativeToken
      ? {
          name: 'testnode',
          symbol: 'TN',
          decimals: 18
        }
      : ether
  }

  return {
    id: chain.chainId,
    name: chain.name,
    network: chain.name.toLowerCase().split(' ').join('-'),
    nativeCurrency: nativeTokenData ?? ether,
    rpcUrls: {
      default: {
        http: [chain.rpcUrl]
      },
      public: {
        http: [chain.rpcUrl]
      }
    },
    blockExplorers: {
      default: {
        name: 'Block Explorer',
        url: chain.explorerUrl
      }
    }
  }
}

export const sepolia: Chain = {
  ...sepoliaDefault,
  rpcUrls: {
    ...sepoliaDefault.rpcUrls,
    // override the default public RPC with the Infura RPC
    // public RPCs are getting rate limited
    default: {
      http: [rpcURLs[ChainId.Sepolia]!]
    }
  }
}

export const holesky: Chain = {
  id: ChainId.Holesky,
  name: 'Holesky',
  network: 'holesky',
  nativeCurrency: ether,
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.Holesky]!]
    },
    public: {
      http: [rpcURLs[ChainId.Holesky]!]
    }
  },
  blockExplorers: {
    etherscan: {
      name: 'Etherscan',
      url: explorerUrls[ChainId.Holesky]!
    },
    default: { name: 'Etherscan', url: explorerUrls[ChainId.Holesky]! }
  }
}

export const arbitrumSepolia: Chain = {
  id: ChainId.ArbitrumSepolia,
  name: 'Arbitrum Sepolia',
  network: 'arbitrum-sepolia',
  nativeCurrency: ether,
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.ArbitrumSepolia]!]
    },
    public: {
      http: [rpcURLs[ChainId.ArbitrumSepolia]!]
    }
  },
  blockExplorers: {
    etherscan: {
      name: 'Arbiscan',
      url: explorerUrls[ChainId.ArbitrumSepolia]!
    },
    default: { name: 'Arbiscan', url: explorerUrls[ChainId.ArbitrumSepolia]! }
  }
}

export const baseSepolia: Chain = {
  id: ChainId.BaseSepolia,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: ether,
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.BaseSepolia]!]
    },
    public: {
      http: [rpcURLs[ChainId.BaseSepolia]!]
    }
  },
  blockExplorers: {
    etherscan: {
      name: 'Basescan',
      url: explorerUrls[ChainId.BaseSepolia]!
    },
    default: { name: 'Basescan', url: explorerUrls[ChainId.BaseSepolia]! }
  }
}

export const arbitrumNova: Chain = {
  id: ChainId.ArbitrumNova,
  name: 'Arbitrum Nova',
  network: 'arbitrum-nova',
  nativeCurrency: ether,
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.ArbitrumNova]!]
    },
    public: {
      http: [rpcURLs[ChainId.ArbitrumNova]!]
    }
  },
  blockExplorers: {
    etherscan: { name: 'Arbiscan', url: 'https://nova.arbiscan.io' },
    default: { name: 'Arbiscan', url: 'https://nova.arbiscan.io' }
  }
}

export const base: Chain = {
  id: ChainId.Base,
  name: 'Base',
  network: 'base',
  nativeCurrency: ether,
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.Base]!]
    },
    public: {
      http: [rpcURLs[ChainId.Base]!]
    }
  },
  blockExplorers: {
    etherscan: { name: 'Basescan', url: explorerUrls[ChainId.Base]! },
    default: { name: 'Basescan', url: explorerUrls[ChainId.Base]! }
  }
}

/**
 * For e2e testing
 */
export const localL1Network: Chain = {
  id: ChainId.Local,
  name: 'Ethereum Local',
  network: 'custom-localhost',
  nativeCurrency: ether,
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
}

/**
 * For e2e testing
 */
export const localL2Network: Chain = {
  id: ChainId.ArbitrumLocal,
  name: 'Arbitrum Local',
  network: 'arbitrum-localhost',
  nativeCurrency: ether,
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.ArbitrumLocal]!]
    },
    public: {
      http: [rpcURLs[ChainId.ArbitrumLocal]!]
    }
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://etherscan.io' }
  }
}

/**
 * For e2e testing
 */
export const localL3Network: Chain = {
  id: ChainId.L3Local,
  name: 'L3 Local',
  network: 'l3-localhost',
  nativeCurrency: ether,
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.L3Local]!]
    },
    public: {
      http: [rpcURLs[ChainId.L3Local]!]
    }
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://etherscan.io' }
  }
}
