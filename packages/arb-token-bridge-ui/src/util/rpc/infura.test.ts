import { expect, it } from 'vitest'

import { ChainId } from '../../types/ChainId'
import { getInfuraRpcUrl, InfuraSupportedChainId } from './infura'

it('successfully returns the correct url for the provided chain and key', () => {
  const key = '123456'

  const result: { [Key in InfuraSupportedChainId]: string } = {
    // L1 Mainnet
    [ChainId.Ethereum]: getInfuraRpcUrl(ChainId.Ethereum, key),
    // L1 Testnet
    [ChainId.Sepolia]: getInfuraRpcUrl(ChainId.Sepolia, key),
    // L2 Mainnet
    [ChainId.ArbitrumOne]: getInfuraRpcUrl(ChainId.ArbitrumOne, key),
    [ChainId.Base]: getInfuraRpcUrl(ChainId.Base, key),
    // L2 Testnet
    [ChainId.ArbitrumSepolia]: getInfuraRpcUrl(ChainId.ArbitrumSepolia, key),
    [ChainId.BaseSepolia]: getInfuraRpcUrl(ChainId.BaseSepolia, key)
  }

  expect(result).toMatchInlineSnapshot(`
    {
      "1": "https://mainnet.infura.io/v3/123456",
      "11155111": "https://sepolia.infura.io/v3/123456",
      "42161": "https://arbitrum-mainnet.infura.io/v3/123456",
      "421614": "https://arbitrum-sepolia.infura.io/v3/123456",
      "8453": "https://base-mainnet.infura.io/v3/123456",
      "84532": "https://base-sepolia.infura.io/v3/123456",
    }
  `)
})
