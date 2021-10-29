export enum ConnectionState {
  LOADING,
  NO_METAMASK,
  WRONG_NETWORK,
  DEPOSIT_MODE,
  WITHDRAW_MODE,
  SEQUENCER_UPDATE,
  NOT_EOA
}

export enum PendingWithdrawalsLoadedState {
  LOADING,
  READY,
  ERROR
}

export const resolveTokenImg = (url: string): string => {
  if (url.startsWith('ipfs')) {
    return `https://ipfs.io/ipfs/${url.substr(7)}`
  }
  return url
}
