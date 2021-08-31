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

export const getTokenImg = (
  networkID: string,
  address: string
  // eslint-disable-next-line consistent-return
): string | undefined => {
  const url = tokenLists[networkID]?.whiteList?.find(
    whitelistedToken =>
      whitelistedToken.address?.toLowerCase() === address?.toLowerCase()
  )?.logoURI
  if (url?.startsWith('ipfs')) {
    return `https://ipfs.io/ipfs/${url.substr(7)}`
  }
}
