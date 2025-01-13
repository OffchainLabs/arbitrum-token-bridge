import { providers } from 'ethers'
import { Chain, ChainProviderFn } from 'wagmi'

import {
  isInfuraSupportedChainId,
  getInfuraKeyFromEnv,
  getInfuraRpcUrl
} from '../rpc/infura'

// custom implementation based on https://github.com/wevm/wagmi/blob/wagmi%400.12.13/packages/core/src/providers/infura.ts
// with multiple infura keys support
export function customInfuraProvider<TChain extends Chain>(): ChainProviderFn<
  TChain,
  providers.InfuraProvider,
  providers.InfuraWebSocketProvider
> {
  return function (chain) {
    if (!isInfuraSupportedChainId(chain.id)) {
      return null
    }

    const infuraKey = getInfuraKeyFromEnv(chain.id)
    const infuraRpcUrl = getInfuraRpcUrl(chain.id)

    return {
      chain: {
        ...chain,
        rpcUrls: {
          ...chain.rpcUrls,
          default: {
            http: [infuraRpcUrl]
          }
        }
      } as TChain,
      provider: () => {
        const provider = new providers.InfuraProvider(
          {
            chainId: chain.id,
            name: chain.network,
            ensAddress: chain.contracts?.ensRegistry?.address
          },
          infuraKey
        )
        return Object.assign(provider)
      },
      webSocketProvider: () =>
        new providers.InfuraWebSocketProvider(
          {
            chainId: chain.id,
            name: chain.network,
            ensAddress: chain.contracts?.ensRegistry?.address
          },
          infuraKey
        )
    }
  }
}
