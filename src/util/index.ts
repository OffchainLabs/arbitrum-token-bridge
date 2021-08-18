import mainnetTokenList from '../media/token-list-42161.json'

export * from './web3'

const allMainnetAddresses: Set<string> = new Set([])
mainnetTokenList.tokens.forEach(tokenInfo => {
  allMainnetAddresses.add(tokenInfo.address.toLocaleLowerCase())
  allMainnetAddresses.add(tokenInfo.extensions.l1Address.toLocaleLowerCase())
})

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
  return allMainnetAddresses.has(address.toLocaleLowerCase())
}
