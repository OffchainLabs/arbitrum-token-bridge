import { tokenLists } from 'token-bridge-sdk'

export enum ConnectionState {
  LOADING,
  NO_METAMASK,
  WRONG_NETWORK,
  DEPOSIT_MODE,
  WITHDRAW_MODE,
  SEQUENCER_UPDATE
}

export enum PendingWithdrawalsLoadedState {
  LOADING,
  READY,
  ERROR
}

export const isMainnetWhiteListed = (address: string) => {
  return !!tokenLists['1'].whiteList.find(
    token => token.address.toLowerCase() === address.toLowerCase()
  )
}
