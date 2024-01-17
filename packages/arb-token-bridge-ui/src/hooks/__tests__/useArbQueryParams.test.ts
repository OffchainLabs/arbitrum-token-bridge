/**
 * @jest-environment jsdom
 */
import { ChainId, customChainLocalStorageKey } from '../../util/networks'
import { ChainParam } from '../useArbQueryParams'

describe('ChainParam custom encoder and decoder', () => {
  describe('encode chainId to chainId/ChainQueryParam', () => {
    it('should return undefined if value is null or undefined', () => {
      expect(ChainParam.encode(null)).toBeUndefined()
      expect(ChainParam.encode(undefined)).toBeUndefined()
    })

    it('should return ChainQueryParam if value is a valid chainId', () => {
      expect(ChainParam.encode(ChainId.Ethereum)).toEqual('ethereum')
      expect(ChainParam.encode(ChainId.ArbitrumOne)).toEqual('arbitrum-one')
      expect(ChainParam.encode(ChainId.Goerli)).toEqual('goerli')
      expect(ChainParam.encode(ChainId.ArbitrumGoerli)).toEqual(
        'arbitrum-goerli'
      )
      expect(ChainParam.encode(1234567890)).toBeUndefined()
      localStorage.setItem(
        customChainLocalStorageKey,
        JSON.stringify([
          { chainID: '1111111111', name: 'custom 1111111111 chain' }
        ])
      )
      expect(ChainParam.encode(1111111111)).toEqual('1111111111')
      localStorage.clear()
    })
  })

  describe('decode chainId/ChainQueryParam to chainId', () => {
    it('should return undefined if value is null or undefined', () => {
      expect(ChainParam.decode(null)).toBeUndefined()
      expect(ChainParam.decode(undefined)).toBeUndefined()
    })

    it('should decode to ChainId if value is a valid ChainQueryParam', () => {
      expect(ChainParam.decode('ethereum')).toEqual(ChainId.Ethereum)
      expect(ChainParam.decode('arbitrum-one')).toEqual(ChainId.ArbitrumOne)
      expect(ChainParam.decode('goerli')).toEqual(ChainId.Goerli)
      expect(ChainParam.decode('arbitrum-goerli')).toEqual(
        ChainId.ArbitrumGoerli
      )
      expect(ChainParam.decode('aaa123')).toBeUndefined()
    })

    it('should decode to ChainId if value is a valid chainId', () => {
      function decodeChainId(value: ChainId) {
        return ChainParam.decode(value.toString())
      }
      expect(decodeChainId(ChainId.Ethereum)).toEqual(ChainId.Ethereum)
      expect(decodeChainId(ChainId.ArbitrumOne)).toEqual(ChainId.ArbitrumOne)
      expect(decodeChainId(ChainId.Goerli)).toEqual(ChainId.Goerli)
      expect(decodeChainId(ChainId.ArbitrumGoerli)).toEqual(
        ChainId.ArbitrumGoerli
      )
      expect(ChainParam.decode('1234567890')).toBeUndefined()
      localStorage.setItem(
        customChainLocalStorageKey,
        JSON.stringify([{ chainID: '222222', name: 'custom 222222 chain' }])
      )
      expect(ChainParam.decode('222222')).toEqual(222222)
      localStorage.clear()
    })
  })
})
