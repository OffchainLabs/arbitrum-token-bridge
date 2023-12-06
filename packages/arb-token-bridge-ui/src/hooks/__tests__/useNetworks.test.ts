/**
 * @jest-environment jsdom
 */
import { ChainId, customChainLocalStorageKey } from '../../util/networks'
import { sanitizeQueryParams } from '../useNetworks'

describe('sanitizeQueryParams', () => {
  let localStorageGetItemMock: jest.Mock

  beforeAll(() => {
    localStorageGetItemMock = global.Storage.prototype.getItem = jest.fn(
      key => {
        if (key === customChainLocalStorageKey) {
          return JSON.stringify([
            {
              chainID: '1111',
              partnerChainID: ChainId.ArbitrumGoerli,
              name: 'custom 1111 chain'
            },
            {
              chainID: '2222',
              partnerChainID: ChainId.ArbitrumSepolia,
              name: 'custom 2222 chain'
            }
          ])
        }
        return null
      }
    )
  })

  afterAll(() => {
    localStorageGetItemMock.mockReset()
  })

  describe('when `destinationChainId` is valid', () => {
    it('and `sourceChainId` is valid should not do anything', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })
      expect(result).toEqual({
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

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
      })
    })
    it('and `sourceChainId` is invalid should set `sourceChainId`', () => {
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

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 1111
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: ChainId.ArbitrumGoerli,
        destinationChainId: 1111
      })
    })
    it('and `sourceChainId` is undefined should set `sourceChainId`', () => {
      const result = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: ChainId.ArbitrumNova
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumNova
      })

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: 1111
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: ChainId.ArbitrumGoerli,
        destinationChainId: 1111
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

  describe('when `destinationChainId` is invalid', () => {
    it('and `sourceChainId` is valid should set `destinationChainId`', () => {
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
        destinationChainId: 12345
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: 2222,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1111,
        destinationChainId: 12345
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
      })
    })
    it('and `sourceChainId` is invalid should set both chainId', () => {
      const result = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 12345
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    })
    it('and `sourceChainId` is undefined should set both chainId', () => {
      const result = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: 12345
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    })
  })

  describe('when `destinationChainId` is undefined', () => {
    it('and `sourceChainId` is valid should set `destinationChainId`', () => {
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

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1111,
        destinationChainId: undefined
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
      })
    })
    it('and `sourceChainId` is invalid should set both chainId', () => {
      const result = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: undefined
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    })
    it('and `sourceChainId` is undefined should set both chainId', () => {
      const result = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: undefined
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    })
  })
})
