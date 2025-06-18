import { constants } from 'ethers'
import { ChainId } from '../../../types/ChainId'
import { CommonAddress } from '../../../util/CommonAddressUtils'

const ApeChainId = 33139
const SuperpositionChainId = 55244

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
    [ApeChainId]: {
      [CommonAddress.Ethereum.USDC]: CommonAddress.ApeChain.USDCe,
      [constants.AddressZero]: CommonAddress.ApeChain.WETH
    },
    [SuperpositionChainId]: {
      [CommonAddress.Ethereum.USDC]: CommonAddress.Superposition.USDCe,
      [constants.AddressZero]: constants.AddressZero
    }
  },
  [ChainId.ArbitrumOne]: {
    [ChainId.Ethereum]: {
      [CommonAddress.ArbitrumOne.USDC]: CommonAddress.Ethereum.USDC,
      [constants.AddressZero]: constants.AddressZero
    },
    [ApeChainId]: {
      [CommonAddress.ArbitrumOne.USDC]: CommonAddress.ApeChain.USDCe,
      [constants.AddressZero]: CommonAddress.ApeChain.WETH
    },
    [SuperpositionChainId]: {
      [CommonAddress.ArbitrumOne.USDC]: CommonAddress.Superposition.USDCe,
      [constants.AddressZero]: constants.AddressZero
    }
  },
  [SuperpositionChainId]: {
    [ChainId.Ethereum]: {
      [CommonAddress.Superposition.USDCe]: CommonAddress.Ethereum.USDC,
      [constants.AddressZero]: constants.AddressZero
    },
    [ChainId.ArbitrumOne]: {
      [CommonAddress.Superposition.USDCe]: CommonAddress.ArbitrumOne.USDC,
      [constants.AddressZero]: constants.AddressZero
    },
    [ApeChainId]: {
      [CommonAddress.Superposition.USDCe]: CommonAddress.ApeChain.USDCe,
      [constants.AddressZero]: CommonAddress.ApeChain.WETH
    }
  },
  [ApeChainId]: {
    [ChainId.Ethereum]: {
      [CommonAddress.ApeChain.USDCe]: CommonAddress.Ethereum.USDC,
      [CommonAddress.ApeChain.WETH]: constants.AddressZero
    },
    [ChainId.ArbitrumOne]: {
      [CommonAddress.ApeChain.USDCe]: CommonAddress.ArbitrumOne.USDC,
      [CommonAddress.ApeChain.WETH]: constants.AddressZero
    },
    [SuperpositionChainId]: {
      [CommonAddress.ApeChain.USDCe]: CommonAddress.Superposition.USDCe,
      [CommonAddress.ApeChain.WETH]: constants.AddressZero
    }
  },
  [ChainId.Base]: {
    [ChainId.ArbitrumOne]: {
      [CommonAddress.Base.USDC]: CommonAddress.ArbitrumOne.USDC,
      [constants.AddressZero]: constants.AddressZero
    },
    [SuperpositionChainId]: {
      [CommonAddress.Base.USDC]: CommonAddress.Superposition.USDCe,
      [constants.AddressZero]: constants.AddressZero
    },
    [ApeChainId]: {
      [CommonAddress.Base.USDC]: CommonAddress.ApeChain.USDCe,
      [constants.AddressZero]: CommonAddress.ApeChain.WETH
    }
  }
}

export const lifiDestinationChainIds: Record<number, number[]> = {
  [ChainId.Ethereum]: [ChainId.ArbitrumOne, ApeChainId, SuperpositionChainId],
  [ChainId.ArbitrumOne]: [ChainId.Ethereum, ApeChainId, SuperpositionChainId],
  [ApeChainId]: [ChainId.Ethereum, ChainId.ArbitrumOne, SuperpositionChainId],
  [SuperpositionChainId]: [ChainId.Ethereum, ChainId.ArbitrumOne, ApeChainId],
  [ChainId.Base]: [ChainId.ArbitrumOne, ApeChainId, SuperpositionChainId]
}
