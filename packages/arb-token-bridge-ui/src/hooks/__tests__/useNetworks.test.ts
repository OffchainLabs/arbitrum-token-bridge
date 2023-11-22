/**
 * @jest-environment jsdom
 */
import { ChainId } from '../../util/networks'
import { sanitizeQueryParams } from '../useNetworks'

describe('sanitizeQueryParams', () => {
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
  })

  it('sets the value for `destinationChainId` to the partner chain of `sourceChainId` when `destinationChainId` is an invalid value', () => {
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
