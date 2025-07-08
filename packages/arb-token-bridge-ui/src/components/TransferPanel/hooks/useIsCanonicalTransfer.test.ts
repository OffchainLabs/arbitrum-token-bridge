import { describe, expect, it } from 'vitest'
import { TokenType } from '../../../hooks/arbTokenBridge.types'
import { isArbitrumCanonicalTransfer } from './useIsCanonicalTransfer'
import { ChainId } from '../../../types/ChainId'

const usdcToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
  type: TokenType.ERC20,
  name: 'USDC',
  listIds: new Set<string>()
}

const rariChainId = 1380012617
const apeChainId = 33139

describe('isArbitrumCanonicalTransfer', () => {
  describe('for deposits', () => {
    it('should return true from Ethereum to Arbitrum One', () => {
      const ethDeposit = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null
      })
      expect(ethDeposit).toBe(true)

      const erc20Deposit = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken
      })
      expect(erc20Deposit).toBe(true)
    })

    it('should return false for withdraw only token', () => {
      const erc20Deposit = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: true,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken
      })
      expect(erc20Deposit).toBe(false)
    })

    it('should return false from Base to Arbitrum One', () => {
      const baseDeposit = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Base,
        sourceChainId: ChainId.Base,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null
      })
      expect(baseDeposit).toBe(false)
    })

    it('should return false for disabled token', () => {
      const deposit = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          address: '0x0ff5A8451A839f5F0BB3562689D9A44089738D11', // rDPX
          decimals: 18,
          symbol: 'rDPX',
          type: TokenType.ERC20,
          name: 'rDPX',
          listIds: new Set<string>()
        }
      })
      expect(deposit).toBe(false)
    })
  })

  describe('for withdrawals', () => {
    it('should return true from Arbitrum One to Ethereum', () => {
      const ethWithdrawal = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null
      })
      expect(ethWithdrawal).toBe(true)

      const erc20Withdrawal = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken
      })
      expect(erc20Withdrawal).toBe(true)
    })

    it('should return true for withdraw only token', () => {
      const erc20Withdrawal = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isSelectedTokenWithdrawOnly: true,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken
      })
      expect(erc20Withdrawal).toBe(true)
    })

    it('should return false from Arbitrum One to Base', () => {
      const baseWithdrawal = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Base,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Base,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null
      })
      expect(baseWithdrawal).toBe(false)
    })

    it('should return false for disabled token', () => {
      const withdrawal = isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          address: '0x43df01681966d5339702e96ef039e481b9da20c1', // FU
          decimals: 18,
          symbol: 'FU',
          type: TokenType.ERC20,
          name: 'FU',
          listIds: new Set<string>()
        }
      })
      expect(withdrawal).toBe(false)
    })
  })

  describe('teleport mode', () => {
    it('should return true from Ethereum to Rari for ETH', () => {
      const teleport = isArbitrumCanonicalTransfer({
        childChainId: rariChainId,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: rariChainId,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null
      })
      expect(teleport).toBe(true)
    })
    it('should return false from Ethereum to Rari for ERC20', () => {
      const teleport = isArbitrumCanonicalTransfer({
        childChainId: rariChainId,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: rariChainId,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken
      })
      expect(teleport).toBe(false)
    })
    it('should return true from Ethereum to Rari for enabled token', () => {
      const teleport = isArbitrumCanonicalTransfer({
        childChainId: rariChainId,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: rariChainId,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          address: '0xFca59Cd816aB1eaD66534D82bc21E7515cE441CF', // RARI
          decimals: 18,
          symbol: 'RARI',
          type: TokenType.ERC20,
          name: 'RARI',
          listIds: new Set<string>()
        }
      })
      expect(teleport).toBe(true)
    })

    it('should return false from Ethereum to ApeChain', () => {
      const ethTeleport = isArbitrumCanonicalTransfer({
        childChainId: apeChainId,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: apeChainId,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null
      })
      expect(ethTeleport).toBe(false)

      const erc20Teleport = isArbitrumCanonicalTransfer({
        childChainId: apeChainId,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: apeChainId,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken
      })
      expect(erc20Teleport).toBe(false)
    })
  })
})
