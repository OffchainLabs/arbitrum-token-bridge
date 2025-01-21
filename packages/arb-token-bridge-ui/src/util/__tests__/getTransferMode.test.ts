import { getTransferMode } from '../getTransferMode'
import { ChainId } from '../../types/ChainId'
import { registerOrbitMainnetChain } from './helpers'

const popApexChainId = 70700
const rariMainnetChainId = 1380012617

beforeAll(() => {
  registerOrbitMainnetChain(popApexChainId)
  registerOrbitMainnetChain(rariMainnetChainId)
})

describe('getTransferMode', () => {
  it('should return correctly for L1 source chain and L2 destination chain', () => {
    const result1 = getTransferMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne
    })
    expect(result1).toEqual('deposit')

    const result2 = getTransferMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumNova
    })

    expect(result2).toEqual('deposit')
  })

  it('should return "deposit" for L2 source chain and L3 destination chain', () => {
    const result1 = getTransferMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: popApexChainId
    })
    expect(result1).toEqual('deposit')

    const result2 = getTransferMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: rariMainnetChainId
    })

    expect(result2).toEqual('deposit')
  })

  it('should return correctly for L2 source chain and L1 destination chain', () => {
    const result1 = getTransferMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    })
    expect(result1).toEqual('withdrawal')

    const result2 = getTransferMode({
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.Ethereum
    })

    expect(result2).toEqual('withdrawal')
  })

  it('should return correctly for L3 source chain and L2 destination chain', () => {
    const result1 = getTransferMode({
      sourceChainId: rariMainnetChainId,
      destinationChainId: ChainId.ArbitrumOne
    })
    expect(result1).toEqual('withdrawal')

    const result2 = getTransferMode({
      sourceChainId: popApexChainId,
      destinationChainId: ChainId.ArbitrumOne
    })

    expect(result2).toEqual('withdrawal')
  })

  it('should return correctly for L1 source chain and L3 destination chain', () => {
    const result1 = getTransferMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: rariMainnetChainId
    })
    expect(result1).toEqual('teleport')

    const result2 = getTransferMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: popApexChainId
    })

    expect(result2).toEqual('teleport')
  })

  it('should return unsupported for L3 source chain and L1 destination chain', () => {
    const result1 = getTransferMode({
      sourceChainId: rariMainnetChainId,
      destinationChainId: ChainId.Ethereum
    })
    expect(result1).toEqual('unsupported')

    const result2 = getTransferMode({
      sourceChainId: popApexChainId,
      destinationChainId: ChainId.Ethereum
    })
    expect(result2).toEqual('unsupported')
  })

  it('should return unsupported for L2 source chain and L2 destination chain', () => {
    const result1 = getTransferMode({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.ArbitrumNova
    })
    expect(result1).toEqual('unsupported')

    const result2 = getTransferMode({
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.ArbitrumOne
    })
    expect(result2).toEqual('unsupported')
  })

  it('should return unsupported for unpaired L1 source chain and L2 destination chain', () => {
    const result1 = getTransferMode({
      sourceChainId: ChainId.Sepolia,
      destinationChainId: ChainId.ArbitrumOne
    })
    expect(result1).toEqual('unsupported')

    const result2 = getTransferMode({
      sourceChainId: ChainId.Sepolia,
      destinationChainId: ChainId.ArbitrumNova
    })
    expect(result2).toEqual('unsupported')

    const result3 = getTransferMode({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumSepolia
    })
    expect(result3).toEqual('unsupported')
  })
})
