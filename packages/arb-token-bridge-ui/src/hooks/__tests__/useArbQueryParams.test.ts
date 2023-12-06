/**
 * @jest-environment jsdom
 */
import { ChainId, customChainLocalStorageKey } from '../../util/networks'
import { AmountQueryParam, ChainParam } from '../useArbQueryParams'

describe('AmountQueryParam custom encoder and decoder', () => {
  describe('encode input field value to query param', () => {
    // input[type="text"] allows any character
    // we allow both dot and comma for decimal separator

    const getEncodeResult = (value: string) => AmountQueryParam.encode(value)

    it('should return input field value after encoding', () => {
      expect(getEncodeResult('10234')).toEqual('10234')
      expect(getEncodeResult('12')).toEqual('12')

      expect(getEncodeResult('1.0234')).toEqual('1.0234')
      expect(getEncodeResult('0.0234')).toEqual('0.0234')
      expect(getEncodeResult('0.0')).toEqual('0.0')
      expect(getEncodeResult('0')).toEqual('0')
      expect(getEncodeResult('0.000')).toEqual('0.000')

      expect(getEncodeResult('1,0234')).toEqual('1.0234')
      expect(getEncodeResult('0,0234')).toEqual('0.0234')
      expect(getEncodeResult('0,0')).toEqual('0.0')
      expect(getEncodeResult('0,000')).toEqual('0.000')

      expect(getEncodeResult('1e1')).toEqual('1e1')
      expect(getEncodeResult('1.0234e4')).toEqual('1.0234e4')
      expect(getEncodeResult('1.0234e-4')).toEqual('1.0234e-4')
      expect(getEncodeResult('1,0234e4')).toEqual('1.0234e4')
      expect(getEncodeResult('1,0234e-4')).toEqual('1.0234e-4')

      expect(getEncodeResult('max')).toEqual('max')
      expect(getEncodeResult('mAx')).toEqual('max')
      expect(getEncodeResult('MAX')).toEqual('max')
      expect(getEncodeResult('MAx')).toEqual('max')
    })

    it('should return the absolute positive value after encoding', () => {
      expect(getEncodeResult('-0.234')).toEqual('0.234')
      expect(getEncodeResult('-0,234')).toEqual('0.234')
      expect(getEncodeResult('-0')).toEqual('0')
      expect(getEncodeResult('-0.123123')).toEqual('0.123123')
      expect(getEncodeResult('-0,123123')).toEqual('0.123123')
      expect(getEncodeResult('-1')).toEqual('1')
      expect(getEncodeResult('-10')).toEqual('10')
    })

    it('should return an empty string after encoding', () => {
      // these should never come into encode from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getEncodeResult('random')).toEqual('')
      expect(getEncodeResult('null')).toEqual('')
      expect(getEncodeResult('1dfk')).toEqual('')
      expect(getEncodeResult('da24')).toEqual('')

      // these should never come into encode from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getEncodeResult('1.23.0')).toEqual('')
      expect(getEncodeResult('1,23,0')).toEqual('')
      expect(getEncodeResult('0,null,123')).toEqual('')
      expect(getEncodeResult('some, text')).toEqual('')

      // it's a quirk of the number field that these won't trigger a value change
      // although the function handles these, if these were input,
      // the value of the input will instantly become an empty string, at least it does on Chrome on Mac
      expect(getEncodeResult('12--32123-32')).toEqual('')
      expect(getEncodeResult('--10.23')).toEqual('')
      expect(getEncodeResult('')).toEqual('')
    })

    it('should return formatted value after encoding', () => {
      expect(getEncodeResult('00.001')).toEqual('0.001')
      expect(getEncodeResult('0000')).toEqual('0')
      expect(getEncodeResult('00.000')).toEqual('0.000')
      expect(getEncodeResult('.1')).toEqual('0.1')
      expect(getEncodeResult('00002.123')).toEqual('2.123')
      expect(getEncodeResult('.0234')).toEqual('0.0234')
      expect(getEncodeResult('123.123000')).toEqual('123.123000')

      expect(getEncodeResult('00,001')).toEqual('0.001')
      expect(getEncodeResult('00,000')).toEqual('0.000')
      expect(getEncodeResult(',1')).toEqual('0.1')
      expect(getEncodeResult('00002,123')).toEqual('2.123')
      expect(getEncodeResult(',0234')).toEqual('0.0234')
      expect(getEncodeResult('123,123000')).toEqual('123.123000')
    })
  })

  describe('decode query param to input field value', () => {
    const getDecodeResult = (value: string) => AmountQueryParam.decode(value)

    it('should return the original value after decoding', () => {
      expect(getDecodeResult('10234')).toEqual('10234')
      expect(getDecodeResult('12')).toEqual('12')

      expect(getDecodeResult('1.0234')).toEqual('1.0234')
      expect(getDecodeResult('0.0234')).toEqual('0.0234')
      expect(getDecodeResult('0.0')).toEqual('0.0')
      expect(getDecodeResult('0')).toEqual('0')
      expect(getDecodeResult('0.000')).toEqual('0.000')

      expect(getDecodeResult('1,0234')).toEqual('1.0234')
      expect(getDecodeResult('0,0234')).toEqual('0.0234')
      expect(getDecodeResult('0,0')).toEqual('0.0')
      expect(getDecodeResult('0,000')).toEqual('0.000')

      expect(getDecodeResult('1e1')).toEqual('1e1')
      expect(getDecodeResult('1.0234e4')).toEqual('1.0234e4')
      expect(getDecodeResult('1.0234e-4')).toEqual('1.0234e-4')
      expect(getDecodeResult('1,0234e4')).toEqual('1.0234e4')
      expect(getDecodeResult('1,0234e-4')).toEqual('1.0234e-4')

      expect(getDecodeResult('max')).toEqual('max')
      expect(getDecodeResult('mAx')).toEqual('max')
      expect(getDecodeResult('MAX')).toEqual('max')
      expect(getDecodeResult('MAx')).toEqual('max')
    })

    it('should return the absolute positive value after decoding', () => {
      expect(getDecodeResult('-0.234')).toEqual('0.234')
      expect(getDecodeResult('-0')).toEqual('0')
      expect(getDecodeResult('-0.123123')).toEqual('0.123123')
      expect(getDecodeResult('-1')).toEqual('1')
      expect(getDecodeResult('-10')).toEqual('10')

      expect(getDecodeResult('-0,234')).toEqual('0.234')
      expect(getDecodeResult('-0,123123')).toEqual('0.123123')
    })

    it('should return an empty string after decoding', () => {
      expect(getDecodeResult('random')).toEqual('')
      expect(getDecodeResult('null')).toEqual('')
      expect(getDecodeResult('1dfk')).toEqual('')
      expect(getDecodeResult('da24')).toEqual('')

      expect(getDecodeResult('1,23,0')).toEqual('')
      expect(getDecodeResult('1.23.0')).toEqual('')
      expect(getDecodeResult('0,null,123')).toEqual('')
      expect(getDecodeResult('some, text')).toEqual('')

      expect(getDecodeResult('12--32123-32')).toEqual('')
      expect(getDecodeResult('--10.23')).toEqual('')
      expect(getDecodeResult('')).toEqual('')
    })

    it('should return formatted value after encoding', () => {
      expect(getDecodeResult('00.001')).toEqual('0.001')
      expect(getDecodeResult('0000')).toEqual('0')
      expect(getDecodeResult('00.000')).toEqual('0.000')
      expect(getDecodeResult('.1')).toEqual('0.1')
      expect(getDecodeResult('00002.123')).toEqual('2.123')
      expect(getDecodeResult('.0234')).toEqual('0.0234')
      expect(getDecodeResult('123.123000')).toEqual('123.123000')

      expect(getDecodeResult('00,001')).toEqual('0.001')
      expect(getDecodeResult('00,000')).toEqual('0.000')
      expect(getDecodeResult(',1')).toEqual('0.1')
      expect(getDecodeResult('00002,123')).toEqual('2.123')
      expect(getDecodeResult(',0234')).toEqual('0.0234')
      expect(getDecodeResult('123,123000')).toEqual('123.123000')
    })
  })
})

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
