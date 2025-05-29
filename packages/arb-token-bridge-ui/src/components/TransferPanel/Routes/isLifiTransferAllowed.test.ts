import { describe, expect, it } from 'vitest'

import {
  ERC20BridgeToken,
  TokenType
} from '../../../hooks/arbTokenBridge.types'
import { ChainId } from '../../../types/ChainId'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { isLifiTransferAllowed } from './isLifiTransferAllowed'

const mockToken: Omit<ERC20BridgeToken, 'address'> = {
  type: TokenType.ERC20,
  name: 'mock',
  symbol: 'mock',
  listIds: new Set(),
  decimals: 6
}

describe('isLifiTransferAllowed', () => {
  describe('return false', () => {
    it('return false for withdrawal mode with invalid token', () => {
      const resultWithInvalidErc20 = isLifiTransferAllowed({
        selectedToken: {
          ...mockToken,
          address: CommonAddress.ArbitrumOne.USDT
        },
        destinationChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne
      })
      expect(resultWithInvalidErc20).toBeFalsy()
    })

    it('return false for teleport mode', () => {
      const resultWithEth = isLifiTransferAllowed({
        selectedToken: null,
        destinationChainId: 1380012617,
        sourceChainId: ChainId.Ethereum
      })
      expect(resultWithEth).toBeFalsy()

      const resultWithValidErc20 = isLifiTransferAllowed({
        selectedToken: {
          ...mockToken,
          address: CommonAddress.Ethereum.USDC
        },
        destinationChainId: 1380012617,
        sourceChainId: ChainId.Ethereum
      })
      expect(resultWithValidErc20).toBeFalsy()
    })

    it('return false for deposit mode', () => {
      const resultWithEth = isLifiTransferAllowed({
        selectedToken: null,
        destinationChainId: ChainId.ArbitrumOne,
        sourceChainId: ChainId.Ethereum
      })
      expect(resultWithEth).toBeFalsy()

      const resultWithValidErc20 = isLifiTransferAllowed({
        selectedToken: {
          ...mockToken,
          address: CommonAddress.ArbitrumOne.USDT
        },
        destinationChainId: ChainId.ArbitrumOne,
        sourceChainId: ChainId.Ethereum
      })
      expect(resultWithValidErc20).toBeFalsy()
    })
  })

  describe('return true', () => {
    it('for withdrawal mode with valid token', () => {
      const resultWithEth = isLifiTransferAllowed({
        selectedToken: null,
        destinationChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne
      })
      expect(resultWithEth).toBeTruthy()

      const resultWithValidErc20 = isLifiTransferAllowed({
        selectedToken: {
          ...mockToken,
          address: CommonAddress.ArbitrumOne.USDC
        },
        destinationChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne
      })
      expect(resultWithValidErc20).toBeTruthy()
    })
  })
})
