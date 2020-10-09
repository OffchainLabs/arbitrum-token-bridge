import * as ethers from 'ethers'
export * from './web3'

export interface BridgeConfig {
  ethProvider: ethers.providers.JsonRpcProvider
  arbProvider: ethers.providers.JsonRpcProvider
  ethSigner?: ethers.ethers.providers.JsonRpcSigner
  arbSigner: ethers.ethers.providers.JsonRpcSigner
}

export enum ConnectionState {
  LOADING,
  NO_METAMASK,
  WRONG_NETWORK,
  DEPOSIT_MODE,
  WITHDRAW_MODE
}
