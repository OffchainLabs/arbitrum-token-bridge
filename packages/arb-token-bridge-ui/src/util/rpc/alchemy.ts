import { ChainId } from '../networks'

export function getAlchemyRpcUrl(chainId: ChainId): string | null {
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY!

  switch (chainId) {
    // L1 Mainnet
    case ChainId.Ethereum:
      return `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`

    // L1 Testnet
    case ChainId.Sepolia:
      return `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
    case ChainId.Holesky:
      return `https://eth-holesky.g.alchemy.com/v2/${alchemyKey}`

    // L2 Mainnet
    case ChainId.ArbitrumOne:
      return `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
    case ChainId.ArbitrumNova:
      return null
    case ChainId.Base:
      return `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`

    // L2 Testnet
    case ChainId.ArbitrumSepolia:
      return `https://arb-sepolia.g.alchemy.com/v2/${alchemyKey}`
    case ChainId.BaseSepolia:
      return `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`

    // Local
    case ChainId.Local:
    case ChainId.ArbitrumLocal:
    case ChainId.L3Local:
      return null
  }
}
