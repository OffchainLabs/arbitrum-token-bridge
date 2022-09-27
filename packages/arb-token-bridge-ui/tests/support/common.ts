import { JsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'

export async function getInitialETHBalance(rpcURL: string): Promise<BigNumber> {
  const goerliProvider = new JsonRpcProvider(rpcURL)
  return await goerliProvider.getBalance(Cypress.env('ADDRESS'))
}

export const goerliRPC = `https://goerli.infura.io/v3/${Cypress.env(
  'INFURA_KEY'
)}`
export const arbitrumGoerliRPC = 'https://goerli-rollup.arbitrum.io/rpc'
