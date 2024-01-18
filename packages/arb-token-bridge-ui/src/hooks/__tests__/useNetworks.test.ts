/**
 * @jest-environment jsdom
 */
import { addCustomChain } from '@arbitrum/sdk'
import {
  ChainId,
  ChainWithRpcUrl,
  customChainLocalStorageKey,
  saveCustomChainToLocalStorage
} from '../../util/networks'
import { sanitizeQueryParams } from '../useNetworks'

function createMockOrbitChain({
  chainId,
  parentChainId
}: {
  chainId: number
  parentChainId: number
}): ChainWithRpcUrl {
  return {
    chainID: chainId,
    confirmPeriodBlocks: 45818,
    ethBridge: {
      bridge: '',
      inbox: '',
      outbox: '',
      rollup: '',
      sequencerInbox: ''
    },
    nativeToken: '',
    explorerUrl: '',
    rpcUrl: '',
    isArbitrum: true,
    isCustom: true,
    name: `Mocked Orbit Chain ${chainId}`,
    slug: `mocked-orbit-chain-${chainId}`,
    partnerChainID: parentChainId,
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '',
      l1ERC20Gateway: '',
      l1GatewayRouter: '',
      l1MultiCall: '',
      l1ProxyAdmin: '',
      l1Weth: '',
      l1WethGateway: '',
      l2CustomGateway: '',
      l2ERC20Gateway: '',
      l2GatewayRouter: '',
      l2Multicall: '',
      l2ProxyAdmin: '',
      l2Weth: '',
      l2WethGateway: ''
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000
  }
}

describe('sanitizeQueryParams', () => {
  let localStorageGetItemMock: jest.Mock

  beforeAll(() => {
    const mockedOrbitChain_1 = createMockOrbitChain({
      chainId: 1111,
      parentChainId: ChainId.ArbitrumGoerli
    })
    const mockedOrbitChain_2 = createMockOrbitChain({
      chainId: 2222,
      parentChainId: ChainId.ArbitrumSepolia
    })
    const mockedOrbitChain_3 = createMockOrbitChain({
      chainId: 3333,
      parentChainId: ChainId.ArbitrumOne
    })
    const mockedOrbitChain_4 = createMockOrbitChain({
      chainId: 4444,
      parentChainId: ChainId.ArbitrumNova
    })

    localStorageGetItemMock = global.Storage.prototype.getItem = jest.fn(
      key => {
        if (key === customChainLocalStorageKey) {
          return JSON.stringify([
            mockedOrbitChain_1,
            mockedOrbitChain_2,
            mockedOrbitChain_3,
            mockedOrbitChain_4
          ])
        }
        return null
      }
    )
    addCustomChain({ customChain: mockedOrbitChain_1 })
    addCustomChain({ customChain: mockedOrbitChain_2 })
    addCustomChain({ customChain: mockedOrbitChain_3 })
    addCustomChain({ customChain: mockedOrbitChain_4 })
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

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
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
        destinationChainId: ChainId.ArbitrumSepolia
      })
      expect(result).toEqual({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })

      // Orbit chains
      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1234,
        destinationChainId: 1111
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: ChainId.ArbitrumGoerli,
        destinationChainId: 1111
      })

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
      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1111,
        destinationChainId: 1234
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
      })

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

      const resultWithGoerliOrbitChain = sanitizeQueryParams({
        sourceChainId: 1111,
        destinationChainId: undefined
      })
      expect(resultWithGoerliOrbitChain).toEqual({
        sourceChainId: 1111,
        destinationChainId: ChainId.ArbitrumGoerli
      })
    })
  })
})
