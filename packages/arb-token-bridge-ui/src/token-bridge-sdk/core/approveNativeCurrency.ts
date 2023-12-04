import { Provider } from '@ethersproject/providers'
import { Signer } from 'ethers'

export type ApproveNativeCurrencyProps = {
  signer: Signer
  destinationChainProvider: Provider
}
