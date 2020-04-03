import { utils } from 'ethers'

export interface Balances {
  balance: string
  arbChainBalance: string
  totalArbBalance: string
  lockBoxBalance: string
  asset: string
}

export interface Template {
  [x: string]: any
}

export interface NFTBalances {
  tokens: utils.BigNumber[]
  arbChainTokens: utils.BigNumber[]
  totalArbTokens: utils.BigNumber[]
  lockBoxTokens: utils.BigNumber[]
  asset: string
}
