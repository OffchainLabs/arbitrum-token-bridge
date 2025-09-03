import { Token as LiFiToken } from '@lifi/sdk'

export type QueryParams = {
  fromToken: string
  toToken: string
  fromChainId: string
  toChainId: string
  fromAddress?: string
  toAddress: string
  fromAmount: string
}

export type Token = Pick<
  LiFiToken,
  'symbol' | 'decimals' | 'address' | 'logoURI'
>

/** This interface is meant to be extended by the different API, it's not meant to be consummed by the bridge  */
export interface CrosschainTransfersRouteBase {
  durationMs: number
  gas: {
    amount: string
    amountUSD: string
    token: Token
  }
  fee: {
    amount: string
    amountUSD: string
    token: Token
  }
  fromAmount: {
    amount: string
    amountUSD: string
    token: Token
  }
  toAmount: {
    amount: string
    amountUSD: string
    token: Token
  }
  fromChainId: number
  toChainId: number
  fromAddress?: string
  toAddress?: string
  spenderAddress: string
}
