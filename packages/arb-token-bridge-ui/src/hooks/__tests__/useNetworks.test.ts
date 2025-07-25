import {
  vi,
  describe,
  beforeAll,
  afterAll,
  it,
  expect,
  MockInstance
} from 'vitest'
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'
import { customChainLocalStorageKey, isNetwork } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { sanitizeQueryParams } from '../useNetworks'
import { createMockOrbitChain } from './helpers'

describe('sanitizeQueryParams', () => {
  let localStorageGetItemMock: MockInstance<(key: string) => string | null>

  beforeAll(() => {
    const mockedOrbitChain_1 = createMockOrbitChain({
      chainId: 2222,
      parentChainId: ChainId.ArbitrumSepolia
    })
    const mockedOrbitChain_2 = createMockOrbitChain({
      chainId: 3333,
      parentChainId: ChainId.ArbitrumOne
    })
    const mockedOrbitChain_3 = createMockOrbitChain({
      chainId: 4444,
      parentChainId: ChainId.ArbitrumNova
    })

    localStorageGetItemMock = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation((key: string) => {
        if (key === customChainLocalStorageKey) {
          return JSON.stringify([
            mockedOrbitChain_1,
            mockedOrbitChain_2,
            mockedOrbitChain_3
          ])
        }
        return null
      })

    registerCustomArbitrumNetwork(mockedOrbitChain_1)
    registerCustomArbitrumNetwork(mockedOrbitChain_2)
    registerCustomArbitrumNetwork(mockedOrbitChain_3)
  })

  afterAll(() => {
    localStorageGetItemMock.mockReset()
  })

  describe('when `destinationChainId` is valid and `sourceChainId` is valid', () => {
    it('should not do anything', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })
      const resultWithArbitrumSepolia = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })
      expect(resultWithArbitrumSepolia).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })
      const resultWithBothChainsBeingTheSame = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.Sepolia
      })
      expect(resultWithBothChainsBeingTheSame).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      // Orbit chains
      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: 2222,
        destinationChainId: ChainId.ArbitrumSepolia
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: 2222,
        destinationChainId: ChainId.ArbitrumSepolia
      })
    })
  })
  describe('when `destinationChainId` is valid and `sourceChainId` is invalid', () => {
    it('should set `sourceChainId` based on `destinationChainId`', () => {
      const result = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: ChainId.ArbitrumSepolia
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      // Orbit chains
      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 2222
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: ChainId.ArbitrumSepolia,
        destinationChainId: 2222
      })

      const resultWithArbitrumOneChain = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 3333
      })
      expect(resultWithArbitrumOneChain).toEqual({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: 3333
      })

      const resultWithArbitrumNovaChain = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 4444
      })
      expect(resultWithArbitrumNovaChain).toEqual({
        sourceChainId: ChainId.ArbitrumNova,
        destinationChainId: 4444
      })
    })
  })
  describe('when `destinationChainId` is valid and `sourceChainId` is undefined', () => {
    it('should set `sourceChainId` based on `destinationChainId`', () => {
      const result = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: ChainId.ArbitrumNova
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumNova
      })

      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: 2222
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: ChainId.ArbitrumSepolia,
        destinationChainId: 2222
      })
    })
  })
  describe('when `destinationChainId` is valid but has no paired source chains and `sourceChainId` is undefined', () => {
    it('should set `sourceChainId` to Ethereum and `destinationChainId` to Arbitrum One', () => {
      const result = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: ChainId.Base
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    })
  })

  describe('when `destinationChainId` is invalid and `sourceChainId` is valid', () => {
    it('should set `destinationChainId` based on `sourceChainId`', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: 12345
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      // Orbit chains
      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: 2222,
        destinationChainId: 1234
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: 2222,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      const resultWithArbitrumOneChain = sanitizeQueryParams({
        sourceChainId: 3333,
        destinationChainId: 1234
      })
      expect(resultWithArbitrumOneChain).toEqual({
        sourceChainId: 3333,
        destinationChainId: ChainId.ArbitrumOne
      })

      const resultWithArbitrumNovaChain = sanitizeQueryParams({
        sourceChainId: 4444,
        destinationChainId: 1234
      })
      expect(resultWithArbitrumNovaChain).toEqual({
        sourceChainId: 4444,
        destinationChainId: ChainId.ArbitrumNova
      })
    })
  })

  describe('when `destinationChainId` is undefined and `sourceChainId` is valid', () => {
    it('should set `destinationChainId` based on `sourceChainId`', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: undefined
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      // Orbit chains
      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: 2222,
        destinationChainId: undefined
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: 2222,
        destinationChainId: ChainId.ArbitrumSepolia
      })
    })
  })
  describe('when `destinationChainId` is undefined and `sourceChainId` is valid but has no paired destination chains', () => {
    it('should set `sourceChainId` to Ethereum and `destinationChainId` to Arbitrum One', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.Base,
        destinationChainId: undefined
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    })
  })

  describe('when `disableTransfersToNonArbitrumChains` is true', () => {
    describe('when `sourceChainId` is Arbitrum and `destinationChainId` is undefined', () => {
      it('should not include non-Arbitrum networks as destination when transfers to non-Arbitrum chains are disabled', () => {
        const result = sanitizeQueryParams({
          sourceChainId: ChainId.ArbitrumOne,
          destinationChainId: undefined,
          disableTransfersToNonArbitrumChains: true
        })

        // Should not default to a non-Arbitrum network
        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })

      it('should not include non-Arbitrum networks as destination for Arbitrum Nova', () => {
        const result = sanitizeQueryParams({
          sourceChainId: ChainId.ArbitrumNova,
          destinationChainId: undefined,
          disableTransfersToNonArbitrumChains: true
        })
        // Should not default to a non-Arbitrum network
        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })

      it('should not include non-Arbitrum networks as destination for Arbitrum Sepolia', () => {
        const result = sanitizeQueryParams({
          sourceChainId: ChainId.ArbitrumSepolia,
          destinationChainId: undefined,
          disableTransfersToNonArbitrumChains: true
        })
        // Should not default to a non-Arbitrum network
        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })
    })

    describe('when `destinationChainId` is Arbitrum and `sourceChainId` is undefined', () => {
      it('should not include non-Arbitrum networks as source when transfers to non-Arbitrum chains are disabled', () => {
        const result = sanitizeQueryParams({
          sourceChainId: undefined,
          destinationChainId: ChainId.ArbitrumOne,
          disableTransfersToNonArbitrumChains: true
        })
        // Should not default to a non-Arbitrum network
        expect(isNetwork(result.sourceChainId).isNonArbitrumNetwork).toBe(false)
      })

      it('should not include non-Arbitrum networks as source for Arbitrum Nova', () => {
        const result = sanitizeQueryParams({
          sourceChainId: undefined,
          destinationChainId: ChainId.ArbitrumNova,
          disableTransfersToNonArbitrumChains: true
        })
        // Should not default to a non-Arbitrum network
        expect(isNetwork(result.sourceChainId).isNonArbitrumNetwork).toBe(false)
      })

      it('should not include non-Arbitrum networks as source for Arbitrum Sepolia', () => {
        const result = sanitizeQueryParams({
          sourceChainId: undefined,
          destinationChainId: ChainId.ArbitrumSepolia,
          disableTransfersToNonArbitrumChains: true
        })
        // Should not default to a non-Arbitrum network
        expect(isNetwork(result.sourceChainId).isNonArbitrumNetwork).toBe(false)
      })
    })

    describe('when both chains are valid but destination is non-Arbitrum', () => {
      it('should redirect to Arbitrum chain when destination is non-Arbitrum', () => {
        const result = sanitizeQueryParams({
          sourceChainId: ChainId.ArbitrumOne,
          destinationChainId: ChainId.Ethereum,
          disableTransfersToNonArbitrumChains: true
        })
        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })

      it('should redirect to Arbitrum chain when destination is Base', () => {
        const result = sanitizeQueryParams({
          sourceChainId: ChainId.ArbitrumOne,
          destinationChainId: ChainId.Base,
          disableTransfersToNonArbitrumChains: true
        })
        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })

      it('should not allow parent chain when even when it is the only valid option', () => {
        const result = sanitizeQueryParams({
          sourceChainId: ChainId.ArbitrumSepolia,
          destinationChainId: ChainId.Sepolia,
          disableTransfersToNonArbitrumChains: true
        })
        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })
    })

    describe('when source is non-Arbitrum and destination is undefined', () => {
      it('should redirect to Arbitrum chain when source is non-Arbitrum', () => {
        const result = sanitizeQueryParams({
          sourceChainId: ChainId.Ethereum,
          destinationChainId: undefined,
          disableTransfersToNonArbitrumChains: true
        })
        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })

      it('should redirect to Arbitrum chain when source is Base', () => {
        const result = sanitizeQueryParams({
          sourceChainId: ChainId.Base,
          destinationChainId: undefined,
          disableTransfersToNonArbitrumChains: true
        })
        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })
    })

    describe('when destination is non-Arbitrum and source is undefined', () => {
      it('should redirect to Arbitrum chain when destination is non-Arbitrum', () => {
        const result = sanitizeQueryParams({
          sourceChainId: undefined,
          destinationChainId: ChainId.Ethereum,
          disableTransfersToNonArbitrumChains: true
        })

        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })

      it('should redirect to Arbitrum chain when destination is Base', () => {
        const result = sanitizeQueryParams({
          sourceChainId: undefined,
          destinationChainId: ChainId.Base,
          disableTransfersToNonArbitrumChains: true
        })
        expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
          false
        )
      })
    })

    describe('when both chains are invalid', () => {
      it('should default to Ethereum and Arbitrum One', () => {
        const result = sanitizeQueryParams({
          sourceChainId: 9999,
          destinationChainId: 8888,
          disableTransfersToNonArbitrumChains: true
        })
        expect(result.sourceChainId).toBe(ChainId.Ethereum)
        expect(result.destinationChainId).toBe(ChainId.ArbitrumOne)
      })
    })

    describe('when both chains are undefined', () => {
      it('should default to Ethereum and Arbitrum One', () => {
        const result = sanitizeQueryParams({
          sourceChainId: undefined,
          destinationChainId: undefined,
          disableTransfersToNonArbitrumChains: true
        })
        expect(result.sourceChainId).toBe(ChainId.Ethereum)
        expect(result.destinationChainId).toBe(ChainId.ArbitrumOne)
      })
    })
  })

  describe('when `disableTransfersToNonArbitrumChains` is false (default behavior)', () => {
    it('should include non-Arbitrum networks as destination for Arbitrum chains', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: undefined,
        disableTransfersToNonArbitrumChains: false
      })
      expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
        true
      )
    })

    it('should include non-Arbitrum networks as source for Arbitrum chains', () => {
      const result = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: ChainId.ArbitrumOne,
        disableTransfersToNonArbitrumChains: false
      })
      expect(isNetwork(result.sourceChainId).isNonArbitrumNetwork).toBe(true)
    })

    it('should allow non-Arbitrum networks as destination when explicitly set', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        disableTransfersToNonArbitrumChains: false
      })
      expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
        true
      )
    })

    it('should allow Base as destination when explicitly set', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Base,
        disableTransfersToNonArbitrumChains: false
      })
      expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
        true
      )
    })
  })

  describe('when `disableTransfersToNonArbitrumChains` is not provided', () => {
    it('should default to false and include non-Arbitrum networks as destination', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: undefined
      })
      expect(isNetwork(result.destinationChainId).isNonArbitrumNetwork).toBe(
        true
      )
    })

    it('should default to false and include non-Arbitrum networks as source', () => {
      const result = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: ChainId.ArbitrumOne
      })
      expect(isNetwork(result.sourceChainId).isNonArbitrumNetwork).toBe(true)
    })
  })

  describe('cache behavior with `disableTransfersToNonArbitrumChains`', () => {
    it('should cache results separately for different disableTransfersToNonArbitrumChains values', () => {
      const result1 = sanitizeQueryParams({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: undefined,
        disableTransfersToNonArbitrumChains: false
      })
      expect(isNetwork(result1.destinationChainId).isNonArbitrumNetwork).toBe(
        true
      )

      const result2 = sanitizeQueryParams({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: undefined,
        disableTransfersToNonArbitrumChains: true
      })
      expect(isNetwork(result2.destinationChainId).isNonArbitrumNetwork).toBe(
        false
      )

      // Should return cached results
      const result3 = sanitizeQueryParams({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: undefined,
        disableTransfersToNonArbitrumChains: false
      })
      expect(isNetwork(result3.destinationChainId).isNonArbitrumNetwork).toBe(
        true
      )

      const result4 = sanitizeQueryParams({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: undefined,
        disableTransfersToNonArbitrumChains: true
      })
      expect(isNetwork(result4.destinationChainId).isNonArbitrumNetwork).toBe(
        false
      )
    })
  })
})
