import { ChainId } from '../../../types/ChainId'

export enum NetworkType {
  parentChain = 'parentChain',
  childChain = 'childChain'
}

export function shouldOpenOneNovaDialog(selectedChainIds: number[]) {
  return [ChainId.ArbitrumOne, ChainId.ArbitrumNova].every(chainId =>
    selectedChainIds.includes(chainId)
  )
}
