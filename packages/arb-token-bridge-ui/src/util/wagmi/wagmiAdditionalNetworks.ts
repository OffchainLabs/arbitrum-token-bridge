import { Chain } from '@rainbow-me/rainbowkit'
import { sepolia as sepoliaDefault } from 'viem/chains'

import { ether } from '../../constants'
import { NativeCurrencyBase } from '../../hooks/useNativeCurrency'
import { ChainId } from '../../types/ChainId'
import { getBridgeUiConfigForChain } from '../bridgeUiConfig'
import { ChainWithRpcUrl, explorerUrls, rpcURLs } from '../networks'

export function chainToWagmiChain(chain: ChainWithRpcUrl): Chain {
  const { nativeTokenData } = getBridgeUiConfigForChain(chain.chainId)

  let nativeCurrency: NativeCurrencyBase = nativeTokenData
    ? {
        ...nativeTokenData,
        decimals: 18
      }
    : ether

  if (chain.chainId === ChainId.L3Local) {
    nativeCurrency = chain.nativeToken
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
    nativeCurrency,
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

export const arbitrumSepolia: Chain = {
  id: ChainId.ArbitrumSepolia,
  name: 'Arbitrum Sepolia',
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
  name: 'Nitro Testnode L1',
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
  name: 'Nitro Testnode L2',
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
  name: 'Nitro Testnode L3',
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
