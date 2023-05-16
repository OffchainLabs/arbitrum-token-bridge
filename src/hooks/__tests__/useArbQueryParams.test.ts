/**
 * @jest-environment jsdom
 */
import { AmountQueryParam } from '../useArbQueryParams'

describe('AmountQueryParam custom encoder and decoder', () => {
  describe('encode input field value to query param', () => {
    // input[type="text"] allows any character
    // we allow both dot and comma for decimal separator

    const getEncodeResult = (value: string) => AmountQueryParam.encode(value)

    it('should return input field value after encoding', () => {
      expect(getEncodeResult('10234')).toBe('10234')
      expect(getEncodeResult('12')).toBe('12')

      expect(getEncodeResult('1.0234')).toBe('1.0234')
      expect(getEncodeResult('0.0234')).toBe('0.0234')
      expect(getEncodeResult('0.0')).toBe('0.0')
      expect(getEncodeResult('0')).toBe('0')
      expect(getEncodeResult('0.000')).toBe('0.000')

      expect(getEncodeResult('1,0234')).toBe('1.0234')
      expect(getEncodeResult('0,0234')).toBe('0.0234')
      expect(getEncodeResult('0,0')).toBe('0.0')
      expect(getEncodeResult('0,000')).toBe('0.000')

      expect(getEncodeResult('1e1')).toBe('1e1')
      expect(getEncodeResult('1.0234e4')).toBe('1.0234e4')
      expect(getEncodeResult('1.0234e-4')).toBe('1.0234e-4')
      expect(getEncodeResult('1,0234e4')).toBe('1.0234e4')
      expect(getEncodeResult('1,0234e-4')).toBe('1.0234e-4')

      expect(getEncodeResult('max')).toBe('max')
      expect(getEncodeResult('mAx')).toBe('max')
      expect(getEncodeResult('MAX')).toBe('max')
      expect(getEncodeResult('MAx')).toBe('max')
    })

    it('should return the absolute positive value after encoding', () => {
      expect(getEncodeResult('-0.234')).toBe('0.234')
      expect(getEncodeResult('-0,234')).toBe('0.234')
      expect(getEncodeResult('-0')).toBe('0')
      expect(getEncodeResult('-0.123123')).toBe('0.123123')
      expect(getEncodeResult('-0,123123')).toBe('0.123123')
      expect(getEncodeResult('-1')).toBe('1')
      expect(getEncodeResult('-10')).toBe('10')
    })

    it('should return an empty string after encoding', () => {
      // these should never come into encode from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getEncodeResult('random')).toBe('')
      expect(getEncodeResult('null')).toBe('')
      expect(getEncodeResult('1dfk')).toBe('')
      expect(getEncodeResult('da24')).toBe('')

      // these should never come into encode from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getEncodeResult('1.23.0')).toBe('')
      expect(getEncodeResult('1,23,0')).toBe('')
      expect(getEncodeResult('0,null,123')).toBe('')
      expect(getEncodeResult('some, text')).toBe('')

      // it's a quirk of the number field that these won't trigger a value change
      // although the function handles these, if these were input,
      // the value of the input will instantly become an empty string, at least it does on Chrome on Mac
      expect(getEncodeResult('12--32123-32')).toBe('')
      expect(getEncodeResult('--10.23')).toBe('')
      expect(getEncodeResult('')).toBe('')
    })

    it('should return formatted value after encoding', () => {
      expect(getEncodeResult('00.001')).toBe('0.001')
      expect(getEncodeResult('0000')).toBe('0')
      expect(getEncodeResult('00.000')).toBe('0.000')
      expect(getEncodeResult('.1')).toBe('0.1')
      expect(getEncodeResult('00002.123')).toBe('2.123')
      expect(getEncodeResult('.0234')).toBe('0.0234')
      expect(getEncodeResult('123.123000')).toBe('123.123000')

      expect(getEncodeResult('00,001')).toBe('0.001')
      expect(getEncodeResult('00,000')).toBe('0.000')
      expect(getEncodeResult(',1')).toBe('0.1')
      expect(getEncodeResult('00002,123')).toBe('2.123')
      expect(getEncodeResult(',0234')).toBe('0.0234')
      expect(getEncodeResult('123,123000')).toBe('123.123000')
    })
  })

  describe('decode query param to input field value', () => {
    const getDecodeResult = (value: string) => AmountQueryParam.decode(value)

    it('should return the original value after decoding', () => {
      expect(getDecodeResult('10234')).toBe('10234')
      expect(getDecodeResult('12')).toBe('12')

      expect(getDecodeResult('1.0234')).toBe('1.0234')
      expect(getDecodeResult('0.0234')).toBe('0.0234')
      expect(getDecodeResult('0.0')).toBe('0.0')
      expect(getDecodeResult('0')).toBe('0')
      expect(getDecodeResult('0.000')).toBe('0.000')

      expect(getDecodeResult('1,0234')).toBe('1.0234')
      expect(getDecodeResult('0,0234')).toBe('0.0234')
      expect(getDecodeResult('0,0')).toBe('0.0')
      expect(getDecodeResult('0,000')).toBe('0.000')

      expect(getDecodeResult('1e1')).toBe('1e1')
      expect(getDecodeResult('1.0234e4')).toBe('1.0234e4')
      expect(getDecodeResult('1.0234e-4')).toBe('1.0234e-4')
      expect(getDecodeResult('1,0234e4')).toBe('1.0234e4')
      expect(getDecodeResult('1,0234e-4')).toBe('1.0234e-4')

      expect(getDecodeResult('max')).toBe('max')
      expect(getDecodeResult('mAx')).toBe('max')
      expect(getDecodeResult('MAX')).toBe('max')
      expect(getDecodeResult('MAx')).toBe('max')
    })

    it('should return the absolute positive value after decoding', () => {
      expect(getDecodeResult('-0.234')).toBe('0.234')
      expect(getDecodeResult('-0')).toBe('0')
      expect(getDecodeResult('-0.123123')).toBe('0.123123')
      expect(getDecodeResult('-1')).toBe('1')
      expect(getDecodeResult('-10')).toBe('10')

      expect(getDecodeResult('-0,234')).toBe('0.234')
      expect(getDecodeResult('-0,123123')).toBe('0.123123')
    })

    it('should return an empty string after decoding', () => {
      expect(getDecodeResult('random')).toBe('')
      expect(getDecodeResult('null')).toBe('')
      expect(getDecodeResult('1dfk')).toBe('')
      expect(getDecodeResult('da24')).toBe('')

      expect(getDecodeResult('1,23,0')).toBe('')
      expect(getDecodeResult('1.23.0')).toBe('')
      expect(getDecodeResult('0,null,123')).toBe('')
      expect(getDecodeResult('some, text')).toBe('')

      expect(getDecodeResult('12--32123-32')).toBe('')
      expect(getDecodeResult('--10.23')).toBe('')
      expect(getDecodeResult('')).toBe('')
    })

    it('should return formatted value after encoding', () => {
      expect(getDecodeResult('00.001')).toBe('0.001')
      expect(getDecodeResult('0000')).toBe('0')
      expect(getDecodeResult('00.000')).toBe('0.000')
      expect(getDecodeResult('.1')).toBe('0.1')
      expect(getDecodeResult('00002.123')).toBe('2.123')
      expect(getDecodeResult('.0234')).toBe('0.0234')
      expect(getDecodeResult('123.123000')).toBe('123.123000')

      expect(getDecodeResult('00,001')).toBe('0.001')
      expect(getDecodeResult('00,000')).toBe('0.000')
      expect(getDecodeResult(',1')).toBe('0.1')
      expect(getDecodeResult('00002,123')).toBe('2.123')
      expect(getDecodeResult(',0234')).toBe('0.0234')
      expect(getDecodeResult('123,123000')).toBe('123.123000')
    })
  })
})
