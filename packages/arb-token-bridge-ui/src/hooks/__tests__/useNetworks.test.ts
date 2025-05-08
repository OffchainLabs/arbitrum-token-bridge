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
import { customChainLocalStorageKey } from '../../util/networks'
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
})
