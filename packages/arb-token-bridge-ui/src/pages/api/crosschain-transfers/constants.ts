import { constants } from 'ethers'
import { ChainId } from '../../../types/ChainId'
import { CommonAddress } from '../../../util/CommonAddressUtils'

// tokensMap is typed loosely here to allow for dynamic keys when checking
export const tokensMap: Record<
  string,
  Record<string, Record<string, string>>
> = {
  [ChainId.Ethereum]: {
    [ChainId.ArbitrumOne]: {
      [CommonAddress.Ethereum.USDC]: CommonAddress.ArbitrumOne.USDC,
      [constants.AddressZero]: constants.AddressZero
    },
    [ChainId.ApeChain]: {
      [CommonAddress.Ethereum.USDC]: CommonAddress.ApeChain.USDCe,
      [constants.AddressZero]: CommonAddress.ApeChain.WETH
    },
    [ChainId.Superposition]: {
      [CommonAddress.Ethereum.USDC]: CommonAddress.Superposition.USDCe,
      [constants.AddressZero]: constants.AddressZero
    }
  },
  [ChainId.ArbitrumOne]: {
    [ChainId.Ethereum]: {
      [CommonAddress.ArbitrumOne.USDC]: CommonAddress.Ethereum.USDC,
      [constants.AddressZero]: constants.AddressZero
    },
    [ChainId.ApeChain]: {
      [CommonAddress.ArbitrumOne.USDC]: CommonAddress.ApeChain.USDCe,
      [constants.AddressZero]: CommonAddress.ApeChain.WETH
    },
    [ChainId.Superposition]: {
      [CommonAddress.ArbitrumOne.USDC]: CommonAddress.Superposition.USDCe,
      [constants.AddressZero]: constants.AddressZero
    }
  },
  [ChainId.Superposition]: {
    [ChainId.Ethereum]: {
      [CommonAddress.Superposition.USDCe]: CommonAddress.Ethereum.USDC,
      [constants.AddressZero]: constants.AddressZero
    },
    [ChainId.ArbitrumOne]: {
      [CommonAddress.Superposition.USDCe]: CommonAddress.ArbitrumOne.USDC,
      [constants.AddressZero]: constants.AddressZero
    },
    [ChainId.ApeChain]: {
      [CommonAddress.Superposition.USDCe]: CommonAddress.ApeChain.USDCe,
      [constants.AddressZero]: CommonAddress.ApeChain.WETH
    }
  },
  [ChainId.ApeChain]: {
    [ChainId.Ethereum]: {
      [CommonAddress.ApeChain.USDCe]: CommonAddress.Ethereum.USDC,
      [CommonAddress.ApeChain.WETH]: constants.AddressZero
    },
    [ChainId.ArbitrumOne]: {
      [CommonAddress.ApeChain.USDCe]: CommonAddress.ArbitrumOne.USDC,
      [CommonAddress.ApeChain.WETH]: constants.AddressZero
    },
    [ChainId.Superposition]: {
      [CommonAddress.ApeChain.USDCe]: CommonAddress.Superposition.USDCe,
      [CommonAddress.ApeChain.WETH]: constants.AddressZero
    }
  },
  [ChainId.Base]: {
    [ChainId.ArbitrumOne]: {
      [CommonAddress.Base.USDC]: CommonAddress.ArbitrumOne.USDC,
      [constants.AddressZero]: constants.AddressZero
    },
    [ChainId.Superposition]: {
      [CommonAddress.Base.USDC]: CommonAddress.Superposition.USDCe,
      [constants.AddressZero]: constants.AddressZero
    },
    [ChainId.ApeChain]: {
      [CommonAddress.Base.USDC]: CommonAddress.ApeChain.USDCe,
      [constants.AddressZero]: CommonAddress.ApeChain.WETH
    }
  }
}

export const lifiDestinationChainIds: Record<number, number[]> = {
  [ChainId.Ethereum]: [
    ChainId.ArbitrumOne,
    ChainId.ApeChain,
    ChainId.Superposition
  ],
  [ChainId.ArbitrumOne]: [
    ChainId.Ethereum,
    ChainId.ApeChain,
    ChainId.Superposition
  ],
  [ChainId.ApeChain]: [
    ChainId.Ethereum,
    ChainId.ArbitrumOne,
    ChainId.Superposition
  ],
  [ChainId.Superposition]: [
    ChainId.Ethereum,
    ChainId.ArbitrumOne,
    ChainId.ApeChain
  ],
  [ChainId.Base]: [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition]
}

export const lifiChildChainIds: Record<number, number[]> = {
  [ChainId.Ethereum]: [
    ChainId.ArbitrumOne,
    ChainId.ApeChain,
    ChainId.Superposition
  ],
  [ChainId.ArbitrumOne]: [ChainId.ApeChain, ChainId.Superposition]
}

export const allowedLifiSourceChainIds: number[] = Object.keys(
  lifiDestinationChainIds
).map(id => Number(id))
export const allowedLifiDestinationChainIds: number[] = Object.values(
  lifiDestinationChainIds
).flatMap(id => id)
