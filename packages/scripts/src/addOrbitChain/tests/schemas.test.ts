import { describe, expect, it } from 'vitest'
import {
  addressSchema,
  bridgeUiConfigSchema,
  chainSchema,
  colorHexSchema,
  descriptionSchema,
  ethBridgeSchema,
  isValidAddress,
  tokenBridgeSchema,
  urlSchema
} from '../schemas'
import {
  mockOrbitChain,
  mockValidTokenBridge
} from './__mocks__/chainDataMocks'

describe('Validation Functions', () => {
  describe('isValidAddress', () => {
    it('should return true for valid Ethereum addresses', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(
        true
      )
      expect(isValidAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')).toBe(
        true
      )
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(
        true
      )
    })

    it('should return false for invalid Ethereum addresses', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44')).toBe(
        false
      ) // Too short
      expect(isValidAddress('742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(
        false
      ) // Missing 0x
      expect(
        isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e0')
      ).toBe(false) // Too long
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44G')).toBe(
        false
      ) // Invalid character
      expect(isValidAddress('not an address')).toBe(false)
    })
  })

  describe('addressSchema', () => {
    it('should validate correct Ethereum addresses', () => {
      expect(() =>
        addressSchema.parse('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')
      ).not.toThrow()
    })

    it('should throw for invalid Ethereum addresses', () => {
      expect(() =>
        addressSchema.parse('0x742d35Cc6634C0532925a3b844Bc454e4438f44')
      ).toThrow()
    })
  })

  describe('urlSchema', () => {
    it('should validate correct URLs', () => {
      expect(() => urlSchema.parse('https://example.com')).not.toThrow()
      expect(() => urlSchema.parse('https://example.com/')).not.toThrow()
      expect(urlSchema.parse('https://example.com/')).toBe(
        'https://example.com'
      )
    })

    it('should throw for invalid URLs', () => {
      expect(() => urlSchema.parse('http://example.com')).toThrow()
      expect(() => urlSchema.parse('https://')).toThrow()
    })
  })

  describe('colorHexSchema', () => {
    it('should validate correct color hex values', () => {
      expect(() => colorHexSchema.parse('#FF0000')).not.toThrow()
      expect(() => colorHexSchema.parse('#f00')).not.toThrow()
    })

    it('should throw for invalid color hex values', () => {
      expect(() => colorHexSchema.parse('FF0000')).toThrow()
      expect(() => colorHexSchema.parse('#FF00')).toThrow()
    })
  })

  describe('descriptionSchema', () => {
    it('should validate and transform descriptions correctly', () => {
      expect(descriptionSchema.parse('A description')).toBe('A description.')
      expect(descriptionSchema.parse('A description.')).toBe('A description.')
    })
  })

  describe('ethBridgeSchema', () => {
    it('should validate correct ethBridge objects', async () => {
      const validEthBridge = {
        bridge: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        inbox: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        outbox: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        rollup: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        sequencerInbox: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      }
      await expect(
        ethBridgeSchema.parseAsync(validEthBridge)
      ).resolves.not.toThrow()
    })

    it('should throw for invalid ethBridge objects', async () => {
      const invalidEthBridge = {
        bridge: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        inbox: 'invalid',
        outbox: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        rollup: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        sequencerInbox: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      }
      await expect(
        ethBridgeSchema.parseAsync(invalidEthBridge)
      ).rejects.toThrow()
    })
  })

  describe('tokenBridgeSchema', () => {
    it('should validate correct tokenBridge objects', async () => {
      const result = await tokenBridgeSchema.parseAsync(mockValidTokenBridge)
      expect(result).toMatchSnapshot()
    })

    it('should throw for invalid tokenBridge objects', async () => {
      const invalidTokenBridge = {
        parentGatewayRouter: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        childGatewayRouter: 'invalid'
      }
      await expect(
        tokenBridgeSchema.parseAsync(invalidTokenBridge)
      ).rejects.toThrowErrorMatchingSnapshot()
    })
  })

  describe('bridgeUiConfigSchema', () => {
    it('should validate correct bridgeUiConfig objects', () => {
      const validBridgeUiConfig = {
        color: '#FF0000',
        network: {
          name: 'Test Network',
          logo: 'https://example.com/logo.png',
          description: 'A test network.'
        },
        nativeTokenData: {
          name: 'Test Token',
          symbol: 'TST',
          decimals: 18,
          logoUrl: 'https://example.com/token-logo.png'
        },
        fastWithdrawalTime: 900000
      }
      expect(() =>
        bridgeUiConfigSchema.parse(validBridgeUiConfig)
      ).not.toThrow()
    })

    it('should throw for invalid bridgeUiConfig objects', () => {
      const invalidBridgeUiConfig = {
        color: 'invalid',
        network: {
          name: '',
          description: 'A'.repeat(251)
        }
      }
      expect(() => bridgeUiConfigSchema.parse(invalidBridgeUiConfig)).toThrow()
    })
  })

  describe('chainSchema', () => {
    it('should validate correct chain objects', async () => {
      await expect(
        chainSchema.parseAsync(mockOrbitChain)
      ).resolves.not.toThrow()
    }, 1000000)

    it('should throw for invalid chain objects', async () => {
      const invalidChain = {
        // Missing required fields
        chainId: 'invalid',
        name: ''
      }
      await expect(chainSchema.parseAsync(invalidChain)).rejects.toThrow()
    }, 1000000)
  })
})
