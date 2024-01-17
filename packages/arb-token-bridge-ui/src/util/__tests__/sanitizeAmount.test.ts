import { sanitizeAmount } from '../NumberUtils'

describe('sanitizeAmount', () => {
  describe('should sanitize amount values correctly', () => {
    // input[type="text"] allows any character
    // we allow both dot and comma for decimal separator

    const getSanitizeResult = (value: string) => sanitizeAmount(value)

    it('should return value as is', () => {
      expect(getSanitizeResult('10234')).toEqual('10234')
      expect(getSanitizeResult('12')).toEqual('12')

      expect(getSanitizeResult('1.0234')).toEqual('1.0234')
      expect(getSanitizeResult('0.0234')).toEqual('0.0234')
      expect(getSanitizeResult('0.0')).toEqual('0.0')
      expect(getSanitizeResult('0')).toEqual('0')
      expect(getSanitizeResult('0.000')).toEqual('0.000')

      expect(getSanitizeResult('1,0234')).toEqual('1.0234')
      expect(getSanitizeResult('0,0234')).toEqual('0.0234')
      expect(getSanitizeResult('0,0')).toEqual('0.0')
      expect(getSanitizeResult('0,000')).toEqual('0.000')

      expect(getSanitizeResult('1e1')).toEqual('1e1')
      expect(getSanitizeResult('1.0234e4')).toEqual('1.0234e4')
      expect(getSanitizeResult('1.0234e-4')).toEqual('1.0234e-4')
      expect(getSanitizeResult('1,0234e4')).toEqual('1.0234e4')
      expect(getSanitizeResult('1,0234e-4')).toEqual('1.0234e-4')

      expect(getSanitizeResult('max')).toEqual('max')
      expect(getSanitizeResult('mAx')).toEqual('max')
      expect(getSanitizeResult('MAX')).toEqual('max')
      expect(getSanitizeResult('MAx')).toEqual('max')
    })

    it('should return the absolute positive value', () => {
      expect(getSanitizeResult('-0.234')).toEqual('0.234')
      expect(getSanitizeResult('-0,234')).toEqual('0.234')
      expect(getSanitizeResult('-0')).toEqual('0')
      expect(getSanitizeResult('-0.123123')).toEqual('0.123123')
      expect(getSanitizeResult('-0,123123')).toEqual('0.123123')
      expect(getSanitizeResult('-1')).toEqual('1')
      expect(getSanitizeResult('-10')).toEqual('10')
    })

    it('should return an empty string', () => {
      // these should never come into encode from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getSanitizeResult('random')).toEqual('')
      expect(getSanitizeResult('null')).toEqual('')
      expect(getSanitizeResult('1dfk')).toEqual('')
      expect(getSanitizeResult('da24')).toEqual('')

      // these should never come into encode from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getSanitizeResult('1.23.0')).toEqual('')
      expect(getSanitizeResult('1,23,0')).toEqual('')
      expect(getSanitizeResult('0,null,123')).toEqual('')
      expect(getSanitizeResult('some, text')).toEqual('')

      // it's a quirk of the number field that these won't trigger a value change
      // although the function handles these, if these were input,
      // the value of the input will instantly become an empty string, at least it does on Chrome on Mac
      expect(getSanitizeResult('12--32123-32')).toEqual('')
      expect(getSanitizeResult('--10.23')).toEqual('')
      expect(getSanitizeResult('')).toEqual('')
    })

    it('should return formatted value', () => {
      expect(getSanitizeResult('00.001')).toEqual('0.001')
      expect(getSanitizeResult('0000')).toEqual('0')
      expect(getSanitizeResult('00.000')).toEqual('0.000')
      expect(getSanitizeResult('.1')).toEqual('0.1')
      expect(getSanitizeResult('00002.123')).toEqual('2.123')
      expect(getSanitizeResult('.0234')).toEqual('0.0234')
      expect(getSanitizeResult('123.123000')).toEqual('123.123000')

      expect(getSanitizeResult('00,001')).toEqual('0.001')
      expect(getSanitizeResult('00,000')).toEqual('0.000')
      expect(getSanitizeResult(',1')).toEqual('0.1')
      expect(getSanitizeResult('00002,123')).toEqual('2.123')
      expect(getSanitizeResult(',0234')).toEqual('0.0234')
      expect(getSanitizeResult('123,123000')).toEqual('123.123000')
    })
  })
})
