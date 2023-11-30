/**
 * @jest-environment jsdom
 */
import { ChainId, customChainLocalStorageKey } from '../../util/networks'
import { sanitizeQueryParams } from '../useNetworks'

describe('sanitizeQueryParams', () => {
  beforeAll(() => {
    localStorage.setItem(
      customChainLocalStorageKey,
      JSON.stringify([
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
    )
  })

  afterAll(() => {
    localStorage.clear()
  })

  it('sets the default values for `sourceChainId` and `destinationChainId` when both `sourceChainId` and `destinationChainId` are `undefined`', () => {
    const result = sanitizeQueryParams({
      sourceChainId: undefined,
      destinationChainId: undefined
    })
    expect(result).toEqual({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne
    })
  })

  it('sets the value for `destinationChainId` to the partner chain of `sourceChainId` when `destinationChainId` is `undefined`', () => {
    const result = sanitizeQueryParams({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: undefined
    })
    expect(result).toEqual({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne
    })

    const resultWithArbitrumOrbitChain = sanitizeQueryParams({
      sourceChainId: 1111,
      destinationChainId: undefined
    })
    expect(resultWithArbitrumOrbitChain).toEqual({
      sourceChainId: 1111,
      destinationChainId: ChainId.ArbitrumGoerli
    })
    const resultWithSepoliaOrbitChain = sanitizeQueryParams({
      sourceChainId: 2222,
      destinationChainId: undefined
    })
    expect(resultWithSepoliaOrbitChain).toEqual({
      sourceChainId: 2222,
      destinationChainId: ChainId.ArbitrumSepolia
    })
  })

  it('sets the value for `sourceChainId` to the partner chain of `destinationChainId` when `sourceChainId` is `undefined`', () => {
    const result = sanitizeQueryParams({
      sourceChainId: undefined,
      destinationChainId: ChainId.ArbitrumNova
    })
    expect(result).toEqual({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumNova
    })

    const resultWithArbitrumOrbitChain = sanitizeQueryParams({
      sourceChainId: undefined,
      destinationChainId: 1111
    })
    expect(resultWithArbitrumOrbitChain).toEqual({
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

  it('sets the value for `destinationChainId` to the partner chain of `sourceChainId` when `destinationChainId` is not a partner chain of `sourceChainId', () => {
    const result = sanitizeQueryParams({
      sourceChainId: ChainId.Goerli,
      destinationChainId: ChainId.ArbitrumOne
    })
    expect(result).toEqual({
      sourceChainId: ChainId.Goerli,
      destinationChainId: ChainId.ArbitrumGoerli
    })
  })
})
