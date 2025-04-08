import { ChainId } from '../../types/ChainId'
import { ProductionChainId } from './getRpcUrl'
import { getAlchemyRpcUrl } from './alchemy'
import { it, expect } from 'vitest'

it('successfully returns the correct url for the provided chain and key', () => {
  const key = '123456'

  const result: { [Key in ProductionChainId]: string } = {
    // L1 Mainnet
    [ChainId.Ethereum]: getAlchemyRpcUrl(ChainId.Ethereum, key),
    // L1 Testnet
    [ChainId.Sepolia]: getAlchemyRpcUrl(ChainId.Sepolia, key),
    [ChainId.Holesky]: getAlchemyRpcUrl(ChainId.Holesky, key),
    // L2 Mainnet
    [ChainId.ArbitrumOne]: getAlchemyRpcUrl(ChainId.ArbitrumOne, key),
    [ChainId.ArbitrumNova]: getAlchemyRpcUrl(ChainId.ArbitrumNova, key),
    [ChainId.Base]: getAlchemyRpcUrl(ChainId.Base, key),
    // L2 Testnet
    [ChainId.ArbitrumSepolia]: getAlchemyRpcUrl(ChainId.ArbitrumSepolia, key),
    [ChainId.BaseSepolia]: getAlchemyRpcUrl(ChainId.BaseSepolia, key)
  }

  expect(result).toMatchInlineSnapshot(`
    {
      "1": "https://eth-mainnet.g.alchemy.com/v2/123456",
      "11155111": "https://eth-sepolia.g.alchemy.com/v2/123456",
      "17000": "https://eth-holesky.g.alchemy.com/v2/123456",
      "42161": "https://arb-mainnet.g.alchemy.com/v2/123456",
      "421614": "https://arb-sepolia.g.alchemy.com/v2/123456",
      "42170": "https://arbnova-mainnet.g.alchemy.com/v2/123456",
      "8453": "https://base-mainnet.g.alchemy.com/v2/123456",
      "84532": "https://base-sepolia.g.alchemy.com/v2/123456",
    }
  `)
})
