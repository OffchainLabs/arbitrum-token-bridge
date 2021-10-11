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
