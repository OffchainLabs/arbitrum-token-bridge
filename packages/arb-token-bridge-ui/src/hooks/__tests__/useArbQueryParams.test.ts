/**
 * @jest-environment jsdom
 */
import { AmountQueryParam } from '../useArbQueryParams'

describe('AmountQueryParam custom encoder and decoder', () => {
  describe('encode input field value to query param', () => {
    // only digits, e, +, or - are allowed in input[type="number"]
    // but for +, the value returned by the input field is still without +
    // we don't want to include the + cases because we don't want to test the browser's native implementation

    const getEncodeResult = (value: string) => AmountQueryParam.encode(value)

    it('should return input field value after encoding', () => {
      expect(getEncodeResult('10234')).toBe('10234')
      expect(getEncodeResult('12')).toBe('12')
      expect(getEncodeResult('1.0234')).toBe('1.0234')
      expect(getEncodeResult('1.0234e4')).toBe('1.0234e4')
      expect(getEncodeResult('1e1')).toBe('1e1')
      expect(getEncodeResult('0.0234')).toBe('0.0234')
      expect(getEncodeResult('0.0')).toBe('0.0')
      expect(getEncodeResult('0.000')).toBe('0.000')
      expect(getEncodeResult('.0234')).toBe('.0234')
      expect(getEncodeResult('1.0234e-4')).toBe('1.0234e-4')
      expect(getEncodeResult('max')).toBe('max')
      expect(getEncodeResult('mAx')).toBe('mAx')
      expect(getEncodeResult('MAX')).toBe('MAX')
      expect(getEncodeResult('MAx')).toBe('MAx')
    })

    it('should return the absolute positive value after encoding', () => {
      expect(getEncodeResult('-0')).toBe('0')
      expect(getEncodeResult('-0.123123')).toBe('0.123123')
      expect(getEncodeResult('-1')).toBe('1')
      expect(getEncodeResult('-10')).toBe('10')
    })

    it('should return an empty string after encoding', () => {
      expect(getEncodeResult('random')).toBe('')
      expect(getEncodeResult('1dfk')).toBe('')
      expect(getEncodeResult('da24')).toBe('')
      expect(getEncodeResult('12--32123-32')).toBe('')
      expect(getEncodeResult('null')).toBe('')
      expect(getEncodeResult('--10.23')).toBe('')
      expect(getEncodeResult('')).toBe('')
    })
  })

  describe('decode query param to input field value', () => {
    const getDecodeResult = (value: string) => AmountQueryParam.decode(value)

    it('should return the original value after decoding', () => {
      expect(getDecodeResult('10234')).toBe('10234')
      expect(getDecodeResult('12')).toBe('12')
      expect(getDecodeResult('1.0234e4')).toBe('1.0234e4')
      expect(getDecodeResult('1e1')).toBe('1e1')
      expect(getDecodeResult('0.0234')).toBe('0.0234')
      expect(getDecodeResult('0.0')).toBe('0.0')
      expect(getDecodeResult('0.000')).toBe('0.000')
      expect(getDecodeResult('.0234')).toBe('.0234')
      expect(getDecodeResult('1.0234e-4')).toBe('1.0234e-4')
      expect(getDecodeResult('0')).toBe('0')
      expect(getDecodeResult('max')).toBe('max')
      expect(getDecodeResult('mAx')).toBe('mAx')
      expect(getDecodeResult('MAX')).toBe('MAX')
      expect(getDecodeResult('MAx')).toBe('MAx')
    })

    it('should return the absolute positive value after decoding', () => {
      expect(getDecodeResult('-0.234')).toBe('0.234')
      expect(getDecodeResult('-0')).toBe('0')
      expect(getDecodeResult('-1')).toBe('1')
      expect(getDecodeResult('-10')).toBe('10')
    })

    it('should return an empty string after decoding', () => {
      expect(getDecodeResult('random')).toBe('')
      expect(getDecodeResult('1,234')).toBe('')
      expect(getDecodeResult('1dfk')).toBe('')
      expect(getDecodeResult('da24')).toBe('')
      expect(getDecodeResult('12--32123-32')).toBe('')
      expect(getDecodeResult('1,23,0')).toBe('')
      expect(getDecodeResult('null')).toBe('')
      expect(getDecodeResult('0,null,123')).toBe('')
      expect(getDecodeResult('some, text')).toBe('')
      expect(getDecodeResult('--10.23')).toBe('')
      expect(getDecodeResult('-1,234')).toBe('')
      expect(getDecodeResult('')).toBe('')
    })
  })
})
