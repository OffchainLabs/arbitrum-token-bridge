import { BigNumber } from 'ethers'
import { formatAmount } from '../NumberUtils'

/* eslint-disable @typescript-eslint/no-loss-of-precision */
describe('formatAmount', () => {
  describe('for short token symbol', () => {
    const getResultFromBigNumber = (value: string) =>
      formatAmount(BigNumber.from(value), { decimals: 6, symbol: 'TOK' })
    const getResultFromNumber = (value: number) =>
      formatAmount(value, { symbol: 'TOK' })

    it('should return 0 for value = 0', () => {
      expect(getResultFromBigNumber('0')).toBe('0 TOK')
      expect(getResultFromNumber(0)).toBe('0 TOK')
    })

    it('should return the full number with 5 decimals for value lower than 1', () => {
      expect(getResultFromBigNumber('30')).toBe('0.00003 TOK')
      expect(getResultFromBigNumber('123456')).toBe('0.12346 TOK')
      expect(getResultFromNumber(0.00003)).toBe('0.00003 TOK')
      expect(getResultFromNumber(0.123456)).toBe('0.12346 TOK')
    })

    it('should return the full number and the decimals for value > 1 and < 10,000', () => {
      expect(getResultFromBigNumber('1234567')).toBe('1.2346 TOK')
      expect(getResultFromBigNumber('12345678')).toBe('12.3457 TOK')
      expect(getResultFromBigNumber('123456789')).toBe('123.4568 TOK')
      expect(getResultFromBigNumber('1234567890')).toBe('1,234.5679 TOK')
      expect(getResultFromNumber(1.234567)).toBe('1.2346 TOK')
      expect(getResultFromNumber(12.345678)).toBe('12.3457 TOK')
      expect(getResultFromNumber(123.456789)).toBe('123.4568 TOK')
      expect(getResultFromNumber(1234.56789)).toBe('1,234.5679 TOK')
    })

    it('should return the full number without decimals for value >= 10,000 and < 1,000,000', () => {
      expect(getResultFromBigNumber('12345678901')).toBe('12,346 TOK')
      expect(getResultFromBigNumber('123456789012')).toBe('123,457 TOK')
      expect(getResultFromNumber(12345.678901)).toBe('12,346 TOK')
      expect(getResultFromNumber(123456.789012)).toBe('123,457 TOK')
    })

    it('should return the shortened number without decimals for value >= 1,000,000', () => {
      expect(getResultFromBigNumber('1234567890123')).toBe('1.235M TOK')
      expect(getResultFromBigNumber('12345678901234')).toBe('12.346M TOK')
      expect(getResultFromBigNumber('123456789012345')).toBe('123.457M TOK')
      expect(getResultFromNumber(1234567.890123)).toBe('1.235M TOK')
      expect(getResultFromNumber(12345678.901234)).toBe('12.346M TOK')
      expect(getResultFromNumber(123456789.012345)).toBe('123.457M TOK')

      expect(getResultFromBigNumber('1234567890123456')).toBe('1.235B TOK')
      expect(getResultFromBigNumber('12345678901234567')).toBe('12.346B TOK')
      expect(getResultFromBigNumber('123456789012345678')).toBe('123.457B TOK')
      expect(getResultFromNumber(1234567890.123456)).toBe('1.235B TOK')
      expect(getResultFromNumber(12345678901.234567)).toBe('12.346B TOK')
      expect(getResultFromNumber(123456789012.345678)).toBe('123.457B TOK')

      expect(getResultFromBigNumber('1234567890123456789')).toBe('1.235T TOK')
      expect(getResultFromBigNumber('12345678901234567890')).toBe('12.346T TOK')
      expect(getResultFromBigNumber('123456789012345678901')).toBe(
        '123.457T TOK'
      )
      expect(getResultFromNumber(1234567890123.456789)).toBe('1.235T TOK')
      expect(getResultFromNumber(12345678901234.56789)).toBe('12.346T TOK')
      expect(getResultFromNumber(123456789012345.678901)).toBe('123.457T TOK')

      expect(getResultFromBigNumber('1234567890123456789012')).toBe(
        '1234.568T TOK'
      )
      expect(getResultFromBigNumber('12345678901234567890123')).toBe(
        '12,345.679T TOK'
      )
      expect(getResultFromNumber(1234567890123456.789012)).toBe('1234.568T TOK')
      expect(getResultFromNumber(12345678901234567.890123)).toBe(
        '12,345.679T TOK'
      )
    })
  })

  describe('for long token name', () => {
    const getResultFromBigNumber = (value: string) =>
      formatAmount(BigNumber.from(value), { decimals: 6, symbol: 'LONGTOKEN' })
    const getResultFromNumber = (value: number) =>
      formatAmount(value, { symbol: 'LONGTOKEN' })

    it('should return 0 for value = 0', () => {
      expect(getResultFromBigNumber('0')).toBe('0 LONGTOKEN')
      expect(getResultFromNumber(0)).toBe('0 LONGTOKEN')
    })

    it('should return the full number with 4 decimals for value lower than 1', () => {
      expect(getResultFromBigNumber('300')).toBe('0.0003 LONGTOKEN')
      expect(getResultFromBigNumber('123456')).toBe('0.1235 LONGTOKEN')
      expect(getResultFromNumber(0.0003)).toBe('0.0003 LONGTOKEN')
      expect(getResultFromNumber(0.123456)).toBe('0.1235 LONGTOKEN')
    })

    it('should return the shortened number without decimals for any value', () => {
      expect(getResultFromBigNumber('1234567')).toBe('1.2 LONGTOKEN')
      expect(getResultFromBigNumber('12345679')).toBe('12.3 LONGTOKEN')
      expect(getResultFromBigNumber('123456789')).toBe('123.5 LONGTOKEN')
      expect(getResultFromNumber(1.234567)).toBe('1.2 LONGTOKEN')
      expect(getResultFromNumber(12.345679)).toBe('12.3 LONGTOKEN')
      expect(getResultFromNumber(123.456789)).toBe('123.5 LONGTOKEN')

      expect(getResultFromBigNumber('1234567890')).toBe('1.2K LONGTOKEN')
      expect(getResultFromBigNumber('12345678901')).toBe('12.3K LONGTOKEN')
      expect(getResultFromBigNumber('123456789012')).toBe('123.5K LONGTOKEN')
      expect(getResultFromNumber(1234.56789)).toBe('1.2K LONGTOKEN')
      expect(getResultFromNumber(12345.678901)).toBe('12.3K LONGTOKEN')
      expect(getResultFromNumber(123456.789012)).toBe('123.5K LONGTOKEN')

      expect(getResultFromBigNumber('1234567890123')).toBe('1.2M LONGTOKEN')
      expect(getResultFromBigNumber('12345678901234')).toBe('12.3M LONGTOKEN')
      expect(getResultFromBigNumber('123456789012345')).toBe('123.5M LONGTOKEN')
      expect(getResultFromNumber(1234567.890123)).toBe('1.2M LONGTOKEN')
      expect(getResultFromNumber(12345678.901234)).toBe('12.3M LONGTOKEN')
      expect(getResultFromNumber(123456789.012345)).toBe('123.5M LONGTOKEN')

      expect(getResultFromBigNumber('1234567890123456')).toBe('1.2B LONGTOKEN')
      expect(getResultFromBigNumber('12345678901234567')).toBe(
        '12.3B LONGTOKEN'
      )
      expect(getResultFromBigNumber('123456789012345678')).toBe(
        '123.5B LONGTOKEN'
      )
      expect(getResultFromNumber(1234567890.123456)).toBe('1.2B LONGTOKEN')
      expect(getResultFromNumber(12345678901.234567)).toBe('12.3B LONGTOKEN')
      expect(getResultFromNumber(123456789012.345678)).toBe('123.5B LONGTOKEN')

      expect(getResultFromBigNumber('1234567890123456789')).toBe(
        '1.2T LONGTOKEN'
      )
      expect(getResultFromBigNumber('12345678901234567890')).toBe(
        '12.3T LONGTOKEN'
      )
      expect(getResultFromBigNumber('123456789012345678901')).toBe(
        '123.5T LONGTOKEN'
      )
      expect(getResultFromNumber(1234567890123.456789)).toBe('1.2T LONGTOKEN')
      expect(getResultFromNumber(12345678901234.56789)).toBe('12.3T LONGTOKEN')
      expect(getResultFromNumber(123456789012345.678901)).toBe(
        '123.5T LONGTOKEN'
      )

      expect(getResultFromBigNumber('1234567890123456789012')).toBe(
        '1234.6T LONGTOKEN'
      )
      expect(getResultFromBigNumber('12345678901234567890123')).toBe(
        '12,345.7T LONGTOKEN'
      )
      expect(getResultFromBigNumber('123456789012345678901234')).toBe(
        '123,456.8T LONGTOKEN'
      )
      expect(getResultFromBigNumber('1234567890123456789012345')).toBe(
        '1,234,567.9T LONGTOKEN'
      )
      expect(getResultFromNumber(1234567890123456.789012)).toBe(
        '1234.6T LONGTOKEN'
      )
      expect(getResultFromNumber(12345678901234567.890123)).toBe(
        '12,345.7T LONGTOKEN'
      )
      expect(getResultFromNumber(123456789012345678.901234)).toBe(
        '123,456.8T LONGTOKEN'
      )
      expect(getResultFromNumber(1234567890123456789.012345)).toBe(
        '1,234,567.9T LONGTOKEN'
      )
    })
  })
})
