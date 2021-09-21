import tokenListMainnet from './token-list-42161.json'

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
  return tokenListMainnet.tokens.find(
    token =>
      token.address.toLowerCase() === address.toLowerCase() ||
      token.extensions.l1Address.toLowerCase() === address.toLowerCase()
  )
}

export const getTokenImg = (
  networkID: string,
  address: string
  // eslint-disable-next-line consistent-return
): string | undefined => {
  if (networkID === '1' || networkID === '42161') {
    const url = tokenListMainnet.tokens.find(
      token =>
        token.address.toLowerCase() === address.toLowerCase() ||
        token.extensions.l1Address.toLowerCase() === address.toLowerCase()
    )?.logoURI
    if (url?.startsWith('ipfs')) {
      return `https://ipfs.io/ipfs/${url.substr(7)}`
    }
    return url
  }
}

export const isTokenWhitelisted = (
  networkID: string,
  address: string
): boolean => {
  if (networkID === '1' || networkID === '42161') {
    const hasToken = tokenListMainnet.tokens.find(
      token =>
        token.address.toLowerCase() === address.toLowerCase() ||
        token.extensions.l1Address.toLowerCase() === address.toLowerCase()
    )
    return !!hasToken
  }
  // TODO not caring for non mainnet, add whatever you want?
  return true
}
