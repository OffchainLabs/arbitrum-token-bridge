import { ChainId } from './networks'

export enum TargetChainKey {
  'Ethereum' = 'mainnet',
  'Arbitrum One' = 'arbitrum-one',
  'Arbitrum Nova' = 'arbitrum-nova',
  'Goerli' = 'goerli',
  'Arbitrum Goerli' = 'arbitrum-goerli',
  'Sepolia' = 'sepolia',
  'Arbitrum Sepolia' = 'arbitrum-sepolia'
}

export const chainIdToWalletConnectKey: { [key in ChainId]?: TargetChainKey } =
  {
    [ChainId.Ethereum]: TargetChainKey['Ethereum'],
    [ChainId.ArbitrumOne]: TargetChainKey['Arbitrum One'],
    [ChainId.ArbitrumNova]: TargetChainKey['Arbitrum Nova'],
    [ChainId.Goerli]: TargetChainKey['Goerli'],
    [ChainId.ArbitrumGoerli]: TargetChainKey['Arbitrum Goerli'],
    [ChainId.Sepolia]: TargetChainKey['Sepolia'],
    [ChainId.ArbitrumSepolia]: TargetChainKey['Arbitrum Sepolia']
  }
