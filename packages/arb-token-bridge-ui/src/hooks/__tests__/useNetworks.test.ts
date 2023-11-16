/**
 * @jest-environment jsdom
 */
import { sanitizeQueryParams } from '../useNetworks'

describe('sanitizeQueryParams', () => {
  it('sets the default values for `from` and `to` when both `from` and `to` are `undefined`', () => {
    const result = sanitizeQueryParams({ from: undefined, to: undefined })
    expect(result).toEqual({ from: 'ethereum', to: 'arbitrumOne' })
  })

  it('sets the value for `to` to the partner chain of `from` when `to` is `undefined`', () => {
    const result = sanitizeQueryParams({ from: 'ethereum', to: undefined })
    expect(result).toEqual({ from: 'ethereum', to: 'arbitrumOne' })
  })

  it('sets the value for `from` to the partner chain of `to` when `from` is `undefined`', () => {
    const result = sanitizeQueryParams({ from: undefined, to: 'arbitrumNova' })
    expect(result).toEqual({ from: 'ethereum', to: 'arbitrumNova' })
  })

  it('sets the value for `to` to the partner chain of `from` when `to` is an invalid value', () => {
    const result = sanitizeQueryParams({ from: 'goerli', to: 'arbitrumOne' })
    expect(result).toEqual({ from: 'goerli', to: 'arbitrumGoerli' })
  })
})
