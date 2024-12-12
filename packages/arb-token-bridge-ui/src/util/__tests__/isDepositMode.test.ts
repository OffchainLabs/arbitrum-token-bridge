import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'

import { isDepositMode } from '../isDepositMode'
import { ChainId } from '../networks'
import { orbitMainnets } from '../orbitChainsList'

beforeAll(() => {
  const xaiMainnetChainId = 660279

  const xaiMainnet = orbitMainnets[xaiMainnetChainId]

  if (!xaiMainnet) {
    throw new Error(`Could not find Xai Mainnet in the Orbit chains list.`)
  }

  registerCustomArbitrumNetwork(xaiMainnet)

  const rariMainnetChainId = 1380012617

  const rariMainnet = orbitMainnets[rariMainnetChainId]

  if (!rariMainnet) {
    throw new Error(`Could not find Rari Mainnet in the Orbit chains list.`)
  }

  registerCustomArbitrumNetwork(rariMainnet)
})

describe('isDepositMode', () => {
  it('should return true for L1 source chain and L2 destination chain', () => {
    const result1 = isDepositMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne
    })
    expect(result1).toBe(true)

    const result2 = isDepositMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumNova
    })

    expect(result2).toBe(true)
  })
  it('should return true for L2 source chain and L3 destination chain', () => {
    const result1 = isDepositMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: 660279 // Xai
    })
    expect(result1).toBe(true)

    const result2 = isDepositMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: 1380012617 // RARI mainnet
    })

    expect(result2).toBe(true)
  })
  it('should return false for L2 source chain and L1 destination chain', () => {
    const result1 = isDepositMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    })
    expect(result1).toBe(false)

    const result2 = isDepositMode({
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.Ethereum
    })

    expect(result2).toBe(false)
  })
  it('should return false for L3 source chain and L2 destination chain', () => {
    const result1 = isDepositMode({
      sourceChainId: 1380012617, // RARI mainnet
      destinationChainId: ChainId.ArbitrumOne
    })
    expect(result1).toBe(false)

    const result2 = isDepositMode({
      sourceChainId: 660279, // Xai
      destinationChainId: ChainId.ArbitrumOne
    })

    expect(result2).toBe(false)
  })
  it('should return true for L1 source chain and L3 destination chain', () => {
    const result1 = isDepositMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: 1380012617 // RARI mainnet
    })
    expect(result1).toBe(true)

    const result2 = isDepositMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: 660279 // Xai
    })

    expect(result2).toBe(true)
  })
  it('should return false for L3 source chain and L1 destination chain', () => {
    const result1 = isDepositMode({
      sourceChainId: 1380012617, // RARI mainnet
      destinationChainId: ChainId.Ethereum
    })
    expect(result1).toBe(false)

    const result2 = isDepositMode({
      sourceChainId: 660279, // Xai
      destinationChainId: ChainId.Ethereum
    })

    expect(result2).toBe(false)
  })
  it('should throw error for L2 source chain and L2 destination chain', () => {
    expect(() =>
      isDepositMode({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.ArbitrumNova
      })
    ).toThrow(new Error('Arbitrum One to Arbitrum Nova is not supported.'))

    expect(() =>
      isDepositMode({
        sourceChainId: ChainId.ArbitrumNova,
        destinationChainId: ChainId.ArbitrumOne
      })
    ).toThrow(new Error('Arbitrum Nova to Arbitrum One is not supported.'))
  })
})
