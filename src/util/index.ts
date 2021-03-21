import * as ethers from 'ethers'
import {
  AssetType
} from 'token-bridge-sdk'
export * from './web3'
export type l2Network = 'v2' | 'v3'
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



interface ConnextTxnParams{
  value: string,
  txID: string,
  assetName: string,
  assetType: AssetType,
  sender: string,
  type: 'connext-deposit' | 'connext-withdraw'
}

export type connextTxn = (txnData: ConnextTxnParams) => Promise<void>;