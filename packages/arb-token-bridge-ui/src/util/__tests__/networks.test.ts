import { ChainId, getBaseChainIdByChainId } from '../networks'

describe('getBaseChainIdByChainId', () => {
  describe('chainId is the id of a base chain and parentChainId is a non-base chain', () => {
    it('should return the chainId', () => {
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.Ethereum,
          parentChainId: ChainId.ArbitrumNova
        })
      ).toBe(ChainId.Ethereum)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.Goerli,
          parentChainId: ChainId.ArbitrumGoerli
        })
      ).toBe(ChainId.Goerli)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.Sepolia,
          parentChainId: ChainId.ArbitrumSepolia
        })
      ).toBe(ChainId.Sepolia)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.Local,
          parentChainId: ChainId.ArbitrumLocal
        })
      ).toBe(ChainId.Local)
    })
  })

  describe('chainId is the id of an L2 chain and parentChainId is the id of an L1 chain', () => {
    it('should return the parent chain id', () => {
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumOne,
          parentChainId: ChainId.Ethereum
        })
      ).toBe(ChainId.Ethereum)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumNova,
          parentChainId: ChainId.Ethereum
        })
      ).toBe(ChainId.Ethereum)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumGoerli,
          parentChainId: ChainId.Goerli
        })
      ).toBe(ChainId.Goerli)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumSepolia,
          parentChainId: ChainId.Sepolia
        })
      ).toBe(ChainId.Sepolia)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumLocal,
          parentChainId: ChainId.Local
        })
      ).toBe(ChainId.Local)
    })
  })

  describe('chainId is the id of an L3 Orbit chain and the parentChainId is the L2 parent chain', () => {
    it('should return the correct base chain', () => {
      // TODO: need a fix in the fn or exclude this test - SDK does not support XaiTestnet so it fails
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.XaiTestnet,
          parentChainId: ChainId.ArbitrumGoerli
        })
      ).toBe(ChainId.Goerli)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.StylusTestnet,
          parentChainId: ChainId.ArbitrumSepolia
        })
      ).toBe(ChainId.Sepolia)
      // TODO: add a custom orbit chain test case
    })
  })
})
