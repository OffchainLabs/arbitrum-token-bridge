interface NetWorkTokens {
  whiteList: string[]
  blackList: string[]
}

import { mainnetWhitelist, mainnetBlackList } from './mainnnetTokenLists'
type TokenLists = {
  [key: string]: NetWorkTokens
}
const tokenLists: TokenLists = {
  '1': {
    whiteList: mainnetWhitelist.map(a => a.address.toLocaleLowerCase()),
    blackList: mainnetBlackList
      .map(a => a.address.toLocaleLowerCase())
      .map(a => a.toLocaleLowerCase())
  },
  '42': {
    whiteList: [
      '0xf36d7a74996e7def7a6bd52b4c2fe64019dada25',
      '0xe41d965f6e7541139f8d9f331176867fb6972baf'
    ].map(a => a.toLocaleLowerCase()),
    blackList: [''].map(a => a.toLocaleLowerCase())
  }
}

export enum TokenStatus {
  WHITELISTED,
  BLACKLISTED,
  NEUTRAL
}

export const getTokenStatus = (_tokenAddress: string, network: string) => {
  const tokenAddress = _tokenAddress.toLocaleLowerCase()
  const list = tokenLists[network]
  if (!list) {
    return TokenStatus.NEUTRAL
  }
  if (list.whiteList.includes(tokenAddress)) {
    return TokenStatus.WHITELISTED
  } else if (list.blackList.includes(tokenAddress)) {
    return TokenStatus.BLACKLISTED
  } else {
    return TokenStatus.NEUTRAL
  }
}
