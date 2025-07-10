import { ChainId } from '../../../types/ChainId'

export const lifiDestinationChainIds: Record<number, number[]> = {
  [ChainId.Ethereum]: [
    ChainId.ArbitrumOne,
    ChainId.ApeChain,
    ChainId.Superposition
  ],
  [ChainId.ArbitrumOne]: [
    ChainId.Ethereum,
    ChainId.ApeChain,
    ChainId.Superposition
  ],
  [ChainId.ApeChain]: [
    ChainId.Ethereum,
    ChainId.ArbitrumOne,
    ChainId.Superposition
  ],
  [ChainId.Superposition]: [
    ChainId.Ethereum,
    ChainId.ArbitrumOne,
    ChainId.ApeChain
  ],
  [ChainId.Base]: [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition]
}

export const allowedLifiSourceChainIds: number[] = Object.keys(
  lifiDestinationChainIds
).map(id => Number(id))
export const allowedLifiDestinationChainIds: number[] = Object.values(
  lifiDestinationChainIds
).flatMap(id => id)
