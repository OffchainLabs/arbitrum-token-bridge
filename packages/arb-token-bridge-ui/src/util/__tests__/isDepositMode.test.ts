import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'

import { orbitMainnets } from '../orbitChainsList'
import { isDepositMode } from '../isDepositMode'
import { ChainId } from '../../types/ChainId'

beforeAll(() => {
  // L2 Orbit, custom gas token: SX
  const sxMainnetChainId = 4162

  const sxMainnet = orbitMainnets[sxMainnetChainId]

  if (!sxMainnet) {
    throw new Error(`Could not find SX Mainnet in the Orbit chains list.`)
  }

  registerCustomArbitrumNetwork(sxMainnet)

  // L3 Orbit, gas token: ETH, valid teleport chain
  const popApexChainId = 70700

  const popApex = orbitMainnets[popApexChainId]

  if (!popApex) {
    throw new Error(`Could not find Pop Apex in the Orbit chains list.`)
  }

  registerCustomArbitrumNetwork(popApex)
})

describe('isDepositMode', () => {
  it('should return true for L1 source chain and L2 destination chain', () => {
    const result1 = isDepositMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne
    })
    expect(result1).toEqual(true)

    const result2 = isDepositMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumNova
    })

    expect(result2).toEqual(true)
  })

  it('should return true for L2 source chain and L3 destination chain', () => {
    const result = isDepositMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: 70700 // PopApex
    })
    expect(result).toEqual(true)
  })

  it('should return true for L1 source chain and L2 Orbit destination chain', () => {
    const result = isDepositMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: 4162 // SX
    })
    expect(result).toEqual(true)
  })

  it('should return false for L2 source chain and L1 destination chain', () => {
    const result1 = isDepositMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    })
    expect(result1).toEqual(false)

    const result2 = isDepositMode({
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.Ethereum
    })

    expect(result2).toEqual(false)
  })

  it('should return false for L2 Orbit source chain and L1 destination chain', () => {
    const result = isDepositMode({
      sourceChainId: 4162, // SX
      destinationChainId: ChainId.Ethereum
    })
    expect(result).toEqual(false)
  })

  it('should return false for L3 source chain and L2 destination chain', () => {
    const result = isDepositMode({
      sourceChainId: 70700, // PopApex
      destinationChainId: ChainId.ArbitrumOne
    })

    expect(result).toEqual(false)
  })

  it('should return false for L1 source chain and L3 destination chain', () => {
    const result = isDepositMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: 70700 // PopApex
    })

    expect(result).toEqual(false)
  })

  it('should return false for L3 source chain and L1 destination chain', () => {
    const result = isDepositMode({
      sourceChainId: 70700, // PopApex
      destinationChainId: ChainId.Ethereum
    })
    expect(result).toEqual(false)
  })

  it('should return false for L2 source chain and L2 destination chain', () => {
    const result1 = isDepositMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.ArbitrumNova
    })
    expect(result1).toEqual(false)

    const result2 = isDepositMode({
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.ArbitrumOne
    })
    expect(result2).toEqual(false)
  })
})
