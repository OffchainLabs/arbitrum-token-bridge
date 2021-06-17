import * as ethers from 'ethers'
import { AssetType } from 'token-bridge-sdk'
import mainnetTokenList from '../media/token-list-42161.json'
export * from './web3'


const allMainnetAddresses: Set<string> = new Set([])
mainnetTokenList.tokens.forEach((tokenInfo)=>{
  allMainnetAddresses.add(tokenInfo.address)
  allMainnetAddresses.add(tokenInfo.extensions.l1Address)
})

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

interface ConnextTxnParams {
  value: string
  txID: string
  assetName: string
  assetType: AssetType
  sender: string
  type: 'connext-deposit' | 'connext-withdraw'
}

export const isMainnetWhiteListed = (address:string)=>{
  return allMainnetAddresses.has(address)
}

export type connextTxn = (txnData: ConnextTxnParams) => Promise<void>
