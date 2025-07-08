import { constants } from 'ethers'
import { bridgedUsdcToken, ether, nativeUsdcToken } from '../../../constants'
import {
  BridgeTokenWithDecimals,
  TokenType
} from '../../../hooks/arbTokenBridge.types'
import { ChainId } from '../../../types/ChainId'
import { CommonAddress } from '../../../util/CommonAddressUtils'

const ApeChainId = 33139
const SuperpositionChainId = 55244

const NATIVE_CURRENCY_IDENTIFIER = constants.AddressZero

// tokensMap is typed loosely here to allow for dynamic keys when checking
export const tokensMap: Record<
  string,
  Record<string, Record<string, string>>
> = {
  [ChainId.Ethereum]: {
    [ChainId.ArbitrumOne]: {
      [CommonAddress.Ethereum.USDC]: CommonAddress.ArbitrumOne.USDC,
      [NATIVE_CURRENCY_IDENTIFIER]: NATIVE_CURRENCY_IDENTIFIER
    },
    [ApeChainId]: {
      [CommonAddress.Ethereum.USDC]: CommonAddress.ApeChain.USDCe,
      [NATIVE_CURRENCY_IDENTIFIER]: CommonAddress.ApeChain.WETH
    },
    [SuperpositionChainId]: {
      [CommonAddress.Ethereum.USDC]: CommonAddress.Superposition.USDCe,
      [NATIVE_CURRENCY_IDENTIFIER]: NATIVE_CURRENCY_IDENTIFIER
    }
  },
  [ChainId.ArbitrumOne]: {
    [ChainId.Ethereum]: {
      [CommonAddress.ArbitrumOne.USDC]: CommonAddress.Ethereum.USDC,
      [NATIVE_CURRENCY_IDENTIFIER]: NATIVE_CURRENCY_IDENTIFIER
    },
    [ApeChainId]: {
      [CommonAddress.ArbitrumOne.USDC]: CommonAddress.ApeChain.USDCe,
      [NATIVE_CURRENCY_IDENTIFIER]: CommonAddress.ApeChain.WETH
    },
    [SuperpositionChainId]: {
      [CommonAddress.ArbitrumOne.USDC]: CommonAddress.Superposition.USDCe,
      [NATIVE_CURRENCY_IDENTIFIER]: NATIVE_CURRENCY_IDENTIFIER
    }
  },
  [SuperpositionChainId]: {
    [ChainId.Ethereum]: {
      [CommonAddress.Superposition.USDCe]: CommonAddress.Ethereum.USDC,
      [NATIVE_CURRENCY_IDENTIFIER]: NATIVE_CURRENCY_IDENTIFIER
    },
    [ChainId.ArbitrumOne]: {
      [CommonAddress.Superposition.USDCe]: CommonAddress.ArbitrumOne.USDC,
      [NATIVE_CURRENCY_IDENTIFIER]: NATIVE_CURRENCY_IDENTIFIER
    },
    [ApeChainId]: {
      [CommonAddress.Superposition.USDCe]: CommonAddress.ApeChain.USDCe,
      [NATIVE_CURRENCY_IDENTIFIER]: CommonAddress.ApeChain.WETH
    }
  },
  [ApeChainId]: {
    [ChainId.Ethereum]: {
      [CommonAddress.ApeChain.USDCe]: CommonAddress.Ethereum.USDC,
      [CommonAddress.ApeChain.WETH]: NATIVE_CURRENCY_IDENTIFIER
    },
    [ChainId.ArbitrumOne]: {
      [CommonAddress.ApeChain.USDCe]: CommonAddress.ArbitrumOne.USDC,
      [CommonAddress.ApeChain.WETH]: NATIVE_CURRENCY_IDENTIFIER
    },
    [SuperpositionChainId]: {
      [CommonAddress.ApeChain.USDCe]: CommonAddress.Superposition.USDCe,
      [CommonAddress.ApeChain.WETH]: NATIVE_CURRENCY_IDENTIFIER
    }
  },
  [ChainId.Base]: {
    [ChainId.ArbitrumOne]: {
      [CommonAddress.Base.USDC]: CommonAddress.ArbitrumOne.USDC,
      [NATIVE_CURRENCY_IDENTIFIER]: NATIVE_CURRENCY_IDENTIFIER
    },
    [SuperpositionChainId]: {
      [CommonAddress.Base.USDC]: CommonAddress.Superposition.USDCe,
      [NATIVE_CURRENCY_IDENTIFIER]: NATIVE_CURRENCY_IDENTIFIER
    },
    [ApeChainId]: {
      [CommonAddress.Base.USDC]: CommonAddress.ApeChain.USDCe,
      [NATIVE_CURRENCY_IDENTIFIER]: CommonAddress.ApeChain.WETH
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

export const lifiChildChainIds: Record<number, number[]> = {
  [ChainId.Ethereum]: [ChainId.ArbitrumOne, ApeChainId, SuperpositionChainId],
  [ChainId.ArbitrumOne]: [ApeChainId, SuperpositionChainId]
}

export const allowedLifiSourceChainIds: number[] = Object.keys(
  lifiDestinationChainIds
).map(id => Number(id))
export const allowedLifiDestinationChainIds: number[] = Object.values(
  lifiDestinationChainIds
).flatMap(id => id)
