import { BigNumber } from 'ethers'
import { formatTokenBalance } from '../NumberUtils'

describe('formatTokenBalance', () => {
  describe('for short token symbol', () => {
    const getResult = (value: string) =>
      formatTokenBalance(BigNumber.from(value), 6, 'ETH')

    it('should return 0 for value = 0', () => {
      expect(getResult('0')).toBe('0')
    })

    it('should return the full number with 5 decimals for value lower than 1', () => {
      expect(getResult('123456')).toBe('0.12346')
    })

    it('should return the full number and the decimals for value > 1 and < 10,000', () => {
      expect(getResult('1234567')).toBe('1.2346')
      expect(getResult('12345679')).toBe('12.3457')
      expect(getResult('123456789')).toBe('123.4568')
      expect(getResult('1234567890')).toBe('1,234.5679')
    })

    it('should return the full number without decimals for value >= 10,000 and < 1,000,000', () => {
      expect(getResult('12345678901')).toBe('12,346')
      expect(getResult('123456789012')).toBe('123,457')
    })

    it('should return the shortened number without decimals for value >= 1,000,000', () => {
      expect(getResult('1234567890123')).toBe('1.235M')
      expect(getResult('12345678901234')).toBe('12.346M')
      expect(getResult('123456789012345')).toBe('123.457M')

      expect(getResult('1234567890123456')).toBe('1.235B')
      expect(getResult('12345678901234567')).toBe('12.346B')
      expect(getResult('123456789012345678')).toBe('123.457B')

      expect(getResult('1234567890123456780')).toBe('1.235T')
      expect(getResult('12345678901234567890')).toBe('12.346T')
      expect(getResult('123456789012345678901')).toBe('123.457T')

      expect(getResult('1234567890123456789012')).toBe('1234.568T')
      expect(getResult('12345678901234567890123')).toBe('12,345.679T')
    })
  })

  describe('for long token name', () => {
    const getResult = (value: string) =>
      formatTokenBalance(BigNumber.from(value), 6, 'ETHPOW')

    it('should return 0 for value = 0', () => {
      expect(getResult('0')).toBe('0')
    })

    it('should return the full number with 4 decimals for value lower than 1', () => {
      expect(getResult('123456')).toBe('0.1235')
    })

    it('should return the shortened number without decimals for any value', () => {
      expect(getResult('1234567')).toBe('1.2')
      expect(getResult('12345679')).toBe('12.3')
      expect(getResult('123456789')).toBe('123.5')

      expect(getResult('1234567890')).toBe('1.2K')
      expect(getResult('12345678901')).toBe('12.3K')
      expect(getResult('123456789012')).toBe('123.5K')

      expect(getResult('1234567890123')).toBe('1.2M')
      expect(getResult('12345678901234')).toBe('12.3M')
      expect(getResult('123456789012345')).toBe('123.5M')

      expect(getResult('1234567890123456')).toBe('1.2B')
      expect(getResult('12345678901234567')).toBe('12.3B')
      expect(getResult('123456789012345678')).toBe('123.5B')

      expect(getResult('1234567890123456789')).toBe('1.2T')
      expect(getResult('12345678901234567890')).toBe('12.3T')
      expect(getResult('123456789012345678901')).toBe('123.5T')

      expect(getResult('1234567890123456789012')).toBe('1234.6T')
      expect(getResult('12345678901234567890123')).toBe('12,345.7T')
      expect(getResult('123456789012345678901234')).toBe('123,456.8T')
      expect(getResult('1234567890123456789012345')).toBe('1,234,567.9T')
    })
  })
})
