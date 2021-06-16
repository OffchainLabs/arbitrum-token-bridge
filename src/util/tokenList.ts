interface NetWorkTokens {
  whiteList: string[]
  blackList: string[]
}

import { mainnetBlackList } from './mainnnetTokenLists'
type TokenLists = {
  [key: string]: NetWorkTokens
}

const mainnetWhitelist = [
  '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  '0x514910771af9ca656af840dff83e8264ecf986ca',
  '0x2ba592f78db6436527729929aaf6c908497cb200',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  '0x6810e776880c02933d47db1b9fc05908e5386b96',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
]

const tokenLists: TokenLists = {
  '1': {
    whiteList: mainnetWhitelist,
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
