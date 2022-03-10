export enum ConnectionState {
  LOADING,
  NO_METAMASK,
  WRONG_NETWORK,
  L1_CONNECTED,
  L2_CONNECTED,
  SEQUENCER_UPDATE,
  NOT_EOA,
  NETWORK_ERROR
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
