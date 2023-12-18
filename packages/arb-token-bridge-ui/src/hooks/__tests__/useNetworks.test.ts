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
            },
            {
              chainID: '3333',
              partnerChainID: ChainId.ArbitrumOne,
              name: 'custom 3333 chain'
            },
            {
              chainID: '4444',
              partnerChainID: ChainId.ArbitrumNova,
              name: 'custom 4444 chain'
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

  describe('when `destinationChainId` is valid and `sourceChainId` is valid', () => {
    it('should not do anything', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia,
        walletChainId: ChainId.Sepolia
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })
      const resultWithArbitrumSepolia = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia,
        walletChainId: ChainId.ArbitrumSepolia
      })
      expect(resultWithArbitrumSepolia).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      // Orbit chains
      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: 2222,
        destinationChainId: ChainId.ArbitrumSepolia,
        walletChainId: ChainId.Sepolia
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: 2222,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli,
        walletChainId: ChainId.Sepolia
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
      })
    })
  })
  describe('when `destinationChainId` is valid and `sourceChainId` is invalid', () => {
    it('should set `sourceChainId` based on `destinationChainId`', () => {
      const result = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: ChainId.ArbitrumSepolia,
        walletChainId: ChainId.Ethereum
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      // Orbit chains
      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 1111,
        walletChainId: ChainId.Ethereum
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: ChainId.ArbitrumGoerli,
        destinationChainId: 1111
      })

      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 2222,
        walletChainId: ChainId.Ethereum
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: ChainId.ArbitrumSepolia,
        destinationChainId: 2222
      })

      const resultWithArbitrumOneChain = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 3333,
        walletChainId: ChainId.Ethereum
      })
      expect(resultWithArbitrumOneChain).toEqual({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: 3333
      })

      const resultWithArbitrumNovaChain = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 4444,
        walletChainId: ChainId.Ethereum
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
        destinationChainId: ChainId.ArbitrumNova,
        walletChainId: ChainId.Ethereum
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumNova
      })

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: 1111,
        walletChainId: ChainId.Ethereum
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: ChainId.ArbitrumGoerli,
        destinationChainId: 1111
      })
      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: 2222,
        walletChainId: ChainId.Ethereum
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: ChainId.ArbitrumSepolia,
        destinationChainId: 2222
      })
    })
  })

  describe('when `destinationChainId` is invalid and `sourceChainId` is valid', () => {
    it('should set `destinationChainId` based on `sourceChainId`', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: 12345,
        walletChainId: ChainId.ArbitrumNova
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      // Orbit chains
      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1111,
        destinationChainId: 1234,
        walletChainId: ChainId.ArbitrumNova
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
      })

      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: 2222,
        destinationChainId: 1234,
        walletChainId: ChainId.ArbitrumNova
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: 2222,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      const resultWithArbitrumOneChain = sanitizeQueryParams({
        sourceChainId: 3333,
        destinationChainId: 1234,
        walletChainId: ChainId.ArbitrumNova
      })
      expect(resultWithArbitrumOneChain).toEqual({
        sourceChainId: 3333,
        destinationChainId: ChainId.ArbitrumOne
      })

      const resultWithArbitrumNovaChain = sanitizeQueryParams({
        sourceChainId: 4444,
        destinationChainId: 1234,
        walletChainId: ChainId.ArbitrumNova
      })
      expect(resultWithArbitrumNovaChain).toEqual({
        sourceChainId: 4444,
        destinationChainId: ChainId.ArbitrumNova
      })
    })
  })
  describe('when `destinationChainId` is invalid and `sourceChainId` is invalid', () => {
    it('should set both chainId based on wallet state', () => {
      const result = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 12345,
        walletChainId: ChainId.ArbitrumNova
      })
      expect(result).toEqual({
        sourceChainId: ChainId.ArbitrumNova,
        destinationChainId: ChainId.Ethereum
      })
    })
  })
  describe('when `destinationChainId` is invalid and `sourceChainId` is undefined', () => {
    it('should set both chainId based on wallet state', () => {
      const result = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: 12345,
        walletChainId: ChainId.ArbitrumSepolia
      })
      expect(result).toEqual({
        sourceChainId: ChainId.ArbitrumSepolia,
        destinationChainId: ChainId.Sepolia
      })
    })
  })

  describe('when `destinationChainId` is undefined and `sourceChainId` is valid', () => {
    it('should set `destinationChainId` based on `sourceChainId`', () => {
      const result = sanitizeQueryParams({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: undefined,
        walletChainId: ChainId.Goerli
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      // Orbit chains
      const resultWithSepoliaOrbitChain = sanitizeQueryParams({
        sourceChainId: 2222,
        destinationChainId: undefined,
        walletChainId: ChainId.Goerli
      })
      expect(resultWithSepoliaOrbitChain).toEqual({
        sourceChainId: 2222,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1111,
        destinationChainId: undefined,
        walletChainId: ChainId.Goerli
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
      })
    })
  })
  describe('when `destinationChainId` is undefined and `sourceChainId` is invalid', () => {
    it('should set both chainId based on wallet state', () => {
      const result = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: undefined,
        walletChainId: ChainId.Goerli
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Goerli,
        destinationChainId: ChainId.ArbitrumGoerli
      })
    })
  })
  describe('when`destinationChainId` is undefined and`sourceChainId` is undefined', () => {
    it('should set both chainId based on wallet state', () => {
      const result = sanitizeQueryParams({
        sourceChainId: undefined,
        destinationChainId: undefined,
        walletChainId: ChainId.XaiTestnet
      })
      expect(result).toEqual({
        sourceChainId: ChainId.XaiTestnet,
        destinationChainId: ChainId.ArbitrumGoerli
      })
    })
  })
})
