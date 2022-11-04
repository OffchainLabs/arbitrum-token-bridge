import { BigNumber } from 'ethers'
import { formatAmount } from '../NumberUtils'

describe('formatAmount', () => {
  describe('for short token symbol', () => {
    const getResultFromBigNumber = (value: string) =>
      formatAmount(BigNumber.from(value), { decimals: 6, symbol: 'TOK' })
    const getResultFromNumber = (value: number) =>
      formatAmount(value, { symbol: 'ETH' })

    it('should return 0 for value = 0', () => {
      expect(getResultFromBigNumber('0')).toBe('0')
      expect(getResultFromNumber(0)).toBe('0')
    })

    it('should return the full number with 5 decimals for value lower than 1', () => {
      expect(getResultFromBigNumber('30')).toBe('0.00003')
      expect(getResultFromBigNumber('123456')).toBe('0.12346')
      expect(getResultFromNumber(0.00003)).toBe('0.00003')
      expect(getResultFromNumber(0.123456)).toBe('0.12346')
    })

    it('should return the full number and the decimals for value > 1 and < 10,000', () => {
      expect(getResultFromBigNumber('1234567')).toBe('1.2346')
      expect(getResultFromBigNumber('12345678')).toBe('12.3457')
      expect(getResultFromBigNumber('123456789')).toBe('123.4568')
      expect(getResultFromBigNumber('1234567890')).toBe('1,234.5679')
      expect(getResultFromNumber(1.234567)).toBe('1.2346')
      expect(getResultFromNumber(12.345678)).toBe('12.3457')
      expect(getResultFromNumber(123.456789)).toBe('123.4568')
      expect(getResultFromNumber(1234.56789)).toBe('1,234.5679')
    })

    it('should return the full number without decimals for value >= 10,000 and < 1,000,000', () => {
      expect(getResultFromBigNumber('12345678901')).toBe('12,346')
      expect(getResultFromBigNumber('123456789012')).toBe('123,457')
      expect(getResultFromNumber(12345.678901)).toBe('12,346')
      expect(getResultFromNumber(123456.789012)).toBe('123,457')
    })

    it('should return the shortened number without decimals for value >= 1,000,000', () => {
      expect(getResultFromBigNumber('1234567890123')).toBe('1.235M')
      expect(getResultFromBigNumber('12345678901234')).toBe('12.346M')
      expect(getResultFromBigNumber('123456789012345')).toBe('123.457M')
      expect(getResultFromNumber(1234567.890123)).toBe('1.235M')
      expect(getResultFromNumber(12345678.901234)).toBe('12.346M')
      expect(getResultFromNumber(123456789.012345)).toBe('123.457M')

      expect(getResultFromBigNumber('1234567890123456')).toBe('1.235B')
      expect(getResultFromBigNumber('12345678901234567')).toBe('12.346B')
      expect(getResultFromBigNumber('123456789012345678')).toBe('123.457B')
      expect(getResultFromNumber(1234567890.123456)).toBe('1.235B')
      expect(getResultFromNumber(12345678901.234567)).toBe('12.346B')
      expect(getResultFromNumber(123456789012.345678)).toBe('123.457B')

      expect(getResultFromBigNumber('1234567890123456789')).toBe('1.235T')
      expect(getResultFromBigNumber('12345678901234567890')).toBe('12.346T')
      expect(getResultFromBigNumber('123456789012345678901')).toBe('123.457T')
      expect(getResultFromNumber(1234567890123.456789)).toBe('1.235T')
      expect(getResultFromNumber(12345678901234.56789)).toBe('12.346T')
      expect(getResultFromNumber(123456789012345.678901)).toBe('123.457T')

      expect(getResultFromBigNumber('1234567890123456789012')).toBe('1234.568T')
      expect(getResultFromBigNumber('12345678901234567890123')).toBe(
        '12,345.679T'
      )
      expect(getResultFromNumber(1234567890123456.789012)).toBe('1234.568T')
      expect(getResultFromNumber(12345678901234567.890123)).toBe('12,345.679T')
    })
  })

  describe('for long token name', () => {
    const getResultFromBigNumber = (value: string) =>
      formatAmount(BigNumber.from(value), { decimals: 6, symbol: 'LONGTOKEN' })
    const getResultFromNumber = (value: number) =>
      formatAmount(value, { symbol: 'ETHPOW' })

    it('should return 0 for value = 0', () => {
      expect(getResultFromBigNumber('0')).toBe('0')
      expect(getResultFromNumber(0)).toBe('0')
    })

    it('should return the full number with 4 decimals for value lower than 1', () => {
      expect(getResultFromBigNumber('300')).toBe('0.0003')
      expect(getResultFromBigNumber('123456')).toBe('0.1235')
      expect(getResultFromNumber(0.0003)).toBe('0.0003')
      expect(getResultFromNumber(0.123456)).toBe('0.1235')
    })

    it('should return the shortened number without decimals for any value', () => {
      expect(getResultFromBigNumber('1234567')).toBe('1.2')
      expect(getResultFromBigNumber('12345679')).toBe('12.3')
      expect(getResultFromBigNumber('123456789')).toBe('123.5')
      expect(getResultFromNumber(1.234567)).toBe('1.2')
      expect(getResultFromNumber(12.345679)).toBe('12.3')
      expect(getResultFromNumber(123.456789)).toBe('123.5')

      expect(getResultFromBigNumber('1234567890')).toBe('1.2K')
      expect(getResultFromBigNumber('12345678901')).toBe('12.3K')
      expect(getResultFromBigNumber('123456789012')).toBe('123.5K')
      expect(getResultFromNumber(1234.56789)).toBe('1.2K')
      expect(getResultFromNumber(12345.678901)).toBe('12.3K')
      expect(getResultFromNumber(123456.789012)).toBe('123.5K')

      expect(getResultFromBigNumber('1234567890123')).toBe('1.2M')
      expect(getResultFromBigNumber('12345678901234')).toBe('12.3M')
      expect(getResultFromBigNumber('123456789012345')).toBe('123.5M')
      expect(getResultFromNumber(1234567.890123)).toBe('1.2M')
      expect(getResultFromNumber(12345678.901234)).toBe('12.3M')
      expect(getResultFromNumber(123456789.012345)).toBe('123.5M')

      expect(getResultFromBigNumber('1234567890123456')).toBe('1.2B')
      expect(getResultFromBigNumber('12345678901234567')).toBe('12.3B')
      expect(getResultFromBigNumber('123456789012345678')).toBe('123.5B')
      expect(getResultFromNumber(1234567890.123456)).toBe('1.2B')
      expect(getResultFromNumber(12345678901.234567)).toBe('12.3B')
      expect(getResultFromNumber(123456789012.345678)).toBe('123.5B')

      expect(getResultFromBigNumber('1234567890123456789')).toBe('1.2T')
      expect(getResultFromBigNumber('12345678901234567890')).toBe('12.3T')
      expect(getResultFromBigNumber('123456789012345678901')).toBe('123.5T')
      expect(getResultFromNumber(1234567890123.456789)).toBe('1.2T')
      expect(getResultFromNumber(12345678901234.56789)).toBe('12.3T')
      expect(getResultFromNumber(123456789012345.678901)).toBe('123.5T')

      expect(getResultFromBigNumber('1234567890123456789012')).toBe('1234.6T')
      expect(getResultFromBigNumber('12345678901234567890123')).toBe(
        '12,345.7T'
      )
      expect(getResultFromBigNumber('123456789012345678901234')).toBe(
        '123,456.8T'
      )
      expect(getResultFromBigNumber('1234567890123456789012345')).toBe(
        '1,234,567.9T'
      )
      expect(getResultFromNumber(1234567890123456.789012)).toBe('1234.6T')
      expect(getResultFromNumber(12345678901234567.890123)).toBe('12,345.7T')
      expect(getResultFromNumber(123456789012345678.901234)).toBe('123,456.8T')
      expect(getResultFromNumber(1234567890123456789.012345)).toBe(
        '1,234,567.9T'
      )
    })
  })
})
