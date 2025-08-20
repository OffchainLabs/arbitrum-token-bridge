import { describe, it, expect } from 'vitest'
import { getAccountType } from '../AccountUtils'
import { ChainId } from '../../types/ChainId'

const EXTERNALLY_OWNED_ACCOUNT = '0x6d051646D4A9df8679E9AD3429e70415f75f6499'
const SEPOLIA_DELEGATED_ACCOUNT = '0x3D3aFFeed8B2004B5F2cD4ef284D0CCb9f150F30'
const SEPOLIA_SMART_CONTRACT_WALLET =
  '0x7765A58d8c6c9287c65936C4F2458785B493CDD8'

describe('getAccountType', () => {
  describe('on Sepolia', () => {
    it('should return externally-owned-account for EXTERNALLY_OWNED_ACCOUNT', async () => {
      const result = await getAccountType({
        address: EXTERNALLY_OWNED_ACCOUNT,
        chainId: ChainId.Sepolia
      })
      expect(result).toBe('externally-owned-account')
    })
    it('should return delegated-account for SEPOLIA_DELEGATED_ACCOUNT', async () => {
      const result = await getAccountType({
        address: SEPOLIA_DELEGATED_ACCOUNT,
        chainId: ChainId.Sepolia
      })
      expect(result).toBe('delegated-account')
    })
    it('should return smart-contract-wallet for SMART_CONTRACT_WALLET', async () => {
      const result = await getAccountType({
        address: SEPOLIA_SMART_CONTRACT_WALLET,
        chainId: ChainId.Sepolia
      })
      expect(result).toBe('smart-contract-wallet')
    })
  })
  describe('on Arbitrum Sepolia', () => {
    it('should return externally-owned-account for EXTERNALLY_OWNED_ACCOUNT', async () => {
      const result = await getAccountType({
        address: EXTERNALLY_OWNED_ACCOUNT,
        chainId: ChainId.ArbitrumSepolia
      })
      expect(result).toBe('externally-owned-account')
    })
    it('should return externally-owned-account for SEPOLIA_DELEGATED_ACCOUNT', async () => {
      const result = await getAccountType({
        address: SEPOLIA_DELEGATED_ACCOUNT,
        chainId: ChainId.ArbitrumSepolia
      })
      expect(result).toBe('externally-owned-account')
    })
  })
})
