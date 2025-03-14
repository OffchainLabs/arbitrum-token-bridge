import { Token as LiFiToken } from '@lifi/sdk'

export type QueryParams = {
  fromToken: string
  toToken: string
  fromChainId: string
  toChainId: string
  fromAddress: string
  toAddress: string
  fromAmount: string
}

export type Token = Pick<
  LiFiToken,
  'symbol' | 'decimals' | 'address' | 'logoURI'
>
export type CrosschainTransfersQuote = {
  durationMs: number
  gas: {
    amount: string
    token: Token
  }
  fee: {
    amount: string
    token: Token
  }
  fromToken: string
  toToken: string
  fromAmount: {
    amount: string
    token: Token
  }
  toAmount: {
    amount: string
    token: Token
  }
  fromChainId: number
  toChainId: number
  fromAddress: string
  toAddress: string
  spenderAddress: string
}
