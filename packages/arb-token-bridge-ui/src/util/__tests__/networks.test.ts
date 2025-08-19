import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'
import {
  it,
  expect,
  describe,
  beforeAll,
  MockInstance,
  vi,
  afterAll
} from 'vitest'

import {
  customChainLocalStorageKey,
  getBlockNumberReferenceChainIdByChainId,
  getDestinationChainIds,
  getSupportedChainIds
} from '../networks'
import { ChainId } from '../../types/ChainId'
import { orbitTestnets, orbitMainnets } from '../orbitChainsList'
import { createMockOrbitChain } from '../../hooks/__tests__/helpers'

const xaiTestnetChainId = 37714555429

beforeAll(() => {
  const xaiTestnet = orbitTestnets[xaiTestnetChainId]

  if (!xaiTestnet) {
    throw new Error(`Could not find Xai Testnet in the Orbit chains list.`)
  }

  // add local
  registerCustomArbitrumNetwork({
    chainId: 412346,
    confirmPeriodBlocks: 20,
    ethBridge: {
      bridge: '0x2b360a9881f21c3d7aa0ea6ca0de2a3341d4ef3c',
      inbox: '0xff4a24b22f94979e9ba5f3eb35838aa814bad6f1',
      outbox: '0x49940929c7cA9b50Ff57a01d3a92817A414E6B9B',
      rollup: '0x65a59d67da8e710ef9a01eca37f83f84aedec416',
      sequencerInbox: '0xe7362d0787b51d8c72d504803e5b1d6dcda89540'
    },
    isCustom: true,
    isTestnet: true,
    name: 'Nitro Testnode L2',
    parentChainId: 1337,
    tokenBridge: {
      parentCustomGateway: '0x75E0E92A79880Bd81A69F72983D03c75e2B33dC8',
      parentErc20Gateway: '0x4Af567288e68caD4aA93A272fe6139Ca53859C70',
      parentGatewayRouter: '0x85D9a8a4bd77b9b5559c1B7FCb8eC9635922Ed49',
      parentMultiCall: '0xA39FFA43ebA037D67a0f4fe91956038ABA0CA386',
      parentProxyAdmin: '0x7E32b54800705876d3b5cFbc7d9c226a211F7C1a',
      parentWeth: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
      parentWethGateway: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
      childCustomGateway: '0x525c2aBA45F66987217323E8a05EA400C65D06DC',
      childErc20Gateway: '0xe1080224B632A93951A7CFA33EeEa9Fd81558b5e',
      childGatewayRouter: '0x1294b86822ff4976BfE136cB06CF43eC7FCF2574',
      childMultiCall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
      childProxyAdmin: '0xda52b25ddB0e3B9CC393b0690Ac62245Ac772527',
      childWeth: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
      childWethGateway: '0x4A2bA922052bA54e29c5417bC979Daaf7D5Fe4f4'
    }
  })

  registerCustomArbitrumNetwork(xaiTestnet)

  const uniteTestnetChainId = 888991
  const uniteTestnet = orbitTestnets[uniteTestnetChainId]

  if (!uniteTestnet) {
    throw new Error(`Could not find Unite Testnet in the Orbit chains list.`)
  }

  registerCustomArbitrumNetwork(uniteTestnet)

  const apeChain = orbitMainnets[ChainId.ApeChain]

  if (!apeChain) {
    throw new Error(`Could not find Ape Chain in the Orbit chains list.`)
  }

  registerCustomArbitrumNetwork(apeChain)

  const superposition = orbitMainnets[ChainId.Superposition]

  if (!superposition) {
    throw new Error(`Could not find Superposition in the Orbit chains list.`)
  }

  registerCustomArbitrumNetwork(superposition)
})

describe('getBlockNumberReferenceChainIdByChainId', () => {
  describe('chainId is the id of a base chain', () => {
    it('should return the chainId', () => {
      expect(
        getBlockNumberReferenceChainIdByChainId({
          chainId: ChainId.Ethereum
        })
      ).toBe(ChainId.Ethereum)
      expect(
        getBlockNumberReferenceChainIdByChainId({
          chainId: ChainId.Sepolia
        })
      ).toBe(ChainId.Sepolia)
      expect(
        getBlockNumberReferenceChainIdByChainId({
          chainId: ChainId.Local
        })
      ).toBe(ChainId.Local)
    })
  })

  describe('chainId is the id of an L2 chain', () => {
    it('should return the correct base chain', () => {
      expect(
        getBlockNumberReferenceChainIdByChainId({
          chainId: ChainId.ArbitrumOne
        })
      ).toBe(ChainId.Ethereum)
      expect(
        getBlockNumberReferenceChainIdByChainId({
          chainId: ChainId.ArbitrumNova
        })
      ).toBe(ChainId.Ethereum)
      expect(
        getBlockNumberReferenceChainIdByChainId({
          chainId: ChainId.ArbitrumSepolia
        })
      ).toBe(ChainId.Sepolia)
      expect(
        getBlockNumberReferenceChainIdByChainId({
          chainId: ChainId.ArbitrumLocal
        })
      ).toBe(ChainId.Local)
    })
  })

  describe('chainId is the id of an L3 Orbit chain', () => {
    it('should return the correct base chain', () => {
      expect(
        getBlockNumberReferenceChainIdByChainId({
          chainId: xaiTestnetChainId
        })
      ).toBe(ChainId.Sepolia)
    })
  })

  describe('chainId is the id of an chain not added to the list of chains', () => {
    it('should return the chainId', () => {
      expect(
        getBlockNumberReferenceChainIdByChainId({
          chainId: 1337
        })
      ).toBe(1337)
    })
  })
})

describe('getSupportedChainIds', () => {
  describe('includeMainnets is true, includeTestnets is unset', () => {
    it('should return a list of chain ids that includes Mainnets', () => {
      expect(getSupportedChainIds({ includeMainnets: true })).toContain(
        ChainId.Ethereum
      )
      expect(getSupportedChainIds({ includeMainnets: true })).toContain(
        ChainId.ArbitrumOne
      )
      expect(getSupportedChainIds({ includeMainnets: true })).toContain(
        ChainId.ArbitrumNova
      )
    })
    it('should return a list of chain ids that does not include Testnets', () => {
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.Sepolia
      )
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.ArbitrumSepolia
      )
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.Local
      )
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.ArbitrumLocal
      )
    })
  })
  describe('includeMainnets is true, includeTestnets is true', () => {
    it('should return a list of chain ids that includes Mainnets', () => {
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.Ethereum)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.ArbitrumOne)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.ArbitrumNova)
    })
    it('should return a list of chain ids that includes Testnets', () => {
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.Sepolia)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.ArbitrumSepolia)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.Local)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.ArbitrumLocal)
    })
  })
  describe('includeMainnets is unset, includeTestnets is true', () => {
    it('should return a list of chain ids that includes Mainnets', () => {
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.Ethereum
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.ArbitrumOne
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.ArbitrumNova
      )
    })
    it('should return a list of chain ids that includes Testnets', () => {
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.Sepolia
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.ArbitrumSepolia
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.Local
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.ArbitrumLocal
      )
    })
  })
  describe('includeMainnets is false, includeTestnets is false', () => {
    it('should return a list of chain ids that includes Mainnets', () => {
      expect(
        getSupportedChainIds({ includeMainnets: false, includeTestnets: false })
      ).toHaveLength(0)
    })
  })
})

describe('getDestinationChainIds', () => {
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

  function isAscending(arr: number[]) {
    return arr.every(
      (value, index) => index === 0 || value >= Number(arr[index - 1])
    )
  }
  it('should return a sorted list for Ethereum Mainnet', () => {
    const destinationChainIds = getDestinationChainIds(ChainId.Ethereum)
    const defaultChainId = destinationChainIds[0]
    const nonDefaultChainIds = destinationChainIds.slice(1)

    expect(defaultChainId).toBe(ChainId.ArbitrumOne)
    expect(isAscending(nonDefaultChainIds)).toBe(true)

    const [arbitrumOne, arbitrumNova, ...orbitChains] = getDestinationChainIds(
      ChainId.Ethereum,
      {
        includeLifiEnabledChainPairs: true
      }
    )

    expect(arbitrumOne).toBe(ChainId.ArbitrumOne)
    expect(arbitrumNova).toBe(ChainId.ArbitrumNova)
    expect(isAscending(orbitChains)).toBe(true)
  })

  it('should return a sorted list for Arbitrum One', () => {
    const destinationChainIds = getDestinationChainIds(ChainId.ArbitrumOne)
    const defaultChainId = destinationChainIds[0]
    const nonDefaultChainIds = destinationChainIds.slice(1)

    expect(defaultChainId).toBe(ChainId.Ethereum)
    expect(isAscending(nonDefaultChainIds)).toBe(true)

    const [ethereum, ...orbitChains] = getDestinationChainIds(
      ChainId.ArbitrumOne,
      {
        includeLifiEnabledChainPairs: true
      }
    )

    expect(ethereum).toBe(ChainId.Ethereum)
    expect(isAscending(orbitChains)).toBe(true)
  })

  it('should return a sorted list for Sepolia', () => {
    const destinationChainIds = getDestinationChainIds(ChainId.Sepolia)
    const defaultChainId = destinationChainIds[0]
    const nonDefaultChainIds = destinationChainIds.slice(1)

    expect(defaultChainId).toBe(ChainId.ArbitrumSepolia)
    expect(isAscending(nonDefaultChainIds)).toBe(true)
  })

  it('should return a sorted list for Arbitrum Sepolia', () => {
    const destinationChainIds = getDestinationChainIds(ChainId.ArbitrumSepolia)
    const defaultChainId = destinationChainIds[0]
    const nonDefaultChainIds = destinationChainIds.slice(1)

    expect(defaultChainId).toBe(ChainId.Sepolia)
    expect(isAscending(nonDefaultChainIds)).toBe(true)
  })

  it('should return a sorted list for Base Sepolia', () => {
    const destinationChainIds = getDestinationChainIds(ChainId.BaseSepolia)
    const defaultChainId = destinationChainIds[0]
    const nonDefaultChainIds = destinationChainIds.slice(1)

    expect(defaultChainId).toBe(888991)
    expect(isAscending(nonDefaultChainIds)).toBe(true)
  })

  describe('should return for Base', () => {
    it('no chains without lifi', () => {
      const destinationChainIds = getDestinationChainIds(ChainId.Base)
      expect(destinationChainIds).toEqual([])
    })

    it('a sorted list with lifi destinations', () => {
      const [arbitrumOne, ...orbitChains] = getDestinationChainIds(
        ChainId.Base,
        {
          includeLifiEnabledChainPairs: true
        }
      )

      expect(arbitrumOne).toBe(ChainId.ArbitrumOne)
      expect(isAscending(orbitChains)).toBe(true)
    })
  })

  describe('when `disableTransfersToNonArbitrumChains` is true', () => {
    it('should exclude non-Arbitrum networks as destination', () => {
      const result = getDestinationChainIds(ChainId.ArbitrumOne, {
        disableTransfersToNonArbitrumChains: true,
        includeLifiEnabledChainPairs: false
      })
      expect(result).toEqual([3333, ChainId.ApeChain, ChainId.Superposition])

      const result2 = getDestinationChainIds(ChainId.ArbitrumOne, {
        disableTransfersToNonArbitrumChains: true,
        includeLifiEnabledChainPairs: true
      })
      expect(result2).toEqual([3333, ChainId.ApeChain, ChainId.Superposition])
    })
  })

  describe('when `disableTransfersToNonArbitrumChains` is false (defaut behavior)', () => {
    it('should include non-Arbitrum networks as destination', () => {
      const result = getDestinationChainIds(ChainId.ArbitrumOne, {
        disableTransfersToNonArbitrumChains: false,
        includeLifiEnabledChainPairs: false
      })
      expect(result).toEqual([
        ChainId.Ethereum,
        3333,
        ChainId.ApeChain,
        ChainId.Superposition
      ])

      const result2 = getDestinationChainIds(ChainId.ArbitrumOne, {
        disableTransfersToNonArbitrumChains: false,
        includeLifiEnabledChainPairs: true
      })
      expect(result2).toEqual([
        1,
        3333,
        ChainId.ApeChain,
        ChainId.Superposition
      ])

      const result3 = getDestinationChainIds(ChainId.ApeChain, {
        disableTransfersToNonArbitrumChains: false,
        includeLifiEnabledChainPairs: false
      })
      expect(result3).toEqual([ChainId.ArbitrumOne])
    })
  })

  describe('when `includeLifiEnabledChainPairs` is true', () => {
    it('should include all lifi destinations', () => {
      const result = getDestinationChainIds(ChainId.ArbitrumOne, {
        disableTransfersToNonArbitrumChains: true,
        includeLifiEnabledChainPairs: true
      })
      expect(result).toEqual([3333, ChainId.ApeChain, ChainId.Superposition])

      // disableTransfersToNonArbitrumChains takes precedence over includeLifiEnabledChainPairs
      const result2 = getDestinationChainIds(ChainId.ArbitrumOne, {
        disableTransfersToNonArbitrumChains: false,
        includeLifiEnabledChainPairs: true
      })
      expect(result2).toEqual([
        ChainId.Ethereum,
        3333,
        ChainId.ApeChain,
        ChainId.Superposition
      ])

      const result3 = getDestinationChainIds(ChainId.ApeChain, {
        disableTransfersToNonArbitrumChains: true,
        includeLifiEnabledChainPairs: true
      })
      expect(result3).toEqual([ChainId.ArbitrumOne, ChainId.Superposition])

      const result4 = getDestinationChainIds(ChainId.ApeChain, {
        disableTransfersToNonArbitrumChains: false,
        includeLifiEnabledChainPairs: true
      })
      expect(result4).toEqual([
        ChainId.Ethereum,
        ChainId.ArbitrumOne,
        ChainId.Superposition
      ])
    })
  })

  describe('when `includeLifiEnabledChainPairs` is false (defaut behavior)', () => {
    it('should exclude all lifi-only destinations', () => {
      const result = getDestinationChainIds(ChainId.ArbitrumOne, {
        disableTransfersToNonArbitrumChains: true,
        includeLifiEnabledChainPairs: false
      })
      expect(result).toEqual([3333, ChainId.ApeChain, ChainId.Superposition])

      // disableTransfersToNonArbitrumChains takes precedence over includeLifiEnabledChainPairs
      const result2 = getDestinationChainIds(ChainId.ArbitrumOne, {
        disableTransfersToNonArbitrumChains: false,
        includeLifiEnabledChainPairs: false
      })
      expect(result2).toEqual([
        ChainId.Ethereum,
        3333,
        ChainId.ApeChain,
        ChainId.Superposition
      ])

      const result3 = getDestinationChainIds(ChainId.ApeChain, {
        disableTransfersToNonArbitrumChains: true,
        includeLifiEnabledChainPairs: false
      })
      expect(result3).toEqual([ChainId.ArbitrumOne])

      const result4 = getDestinationChainIds(ChainId.ApeChain, {
        disableTransfersToNonArbitrumChains: false,
        includeLifiEnabledChainPairs: false
      })
      expect(result4).toEqual([ChainId.ArbitrumOne])
    })
  })
})
