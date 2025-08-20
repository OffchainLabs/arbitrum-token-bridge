import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { ConnectionInfo } from 'ethers/lib/utils'

export const getProvider = (chainInfo: {
  rpcUrl: string
  name: string
  chainId: number
}) => {
  const THROTTLE_LIMIT = 10

  const connection: ConnectionInfo = {
    url: chainInfo.rpcUrl,
    timeout: 300000,
    allowGzip: true,
    skipFetchSetup: true,
    throttleLimit: THROTTLE_LIMIT,
    throttleSlotInterval: 3000,
    throttleCallback: async (attempt: number) => {
      // Always retry until we hit the THROTTLE_LIMIT
      // Otherwise, it only throttles for specific response codes
      // Return true to continue retrying, false to stop
      return attempt <= THROTTLE_LIMIT
    },
    headers: {
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  }

  const provider = new StaticJsonRpcProvider(connection, {
    name: chainInfo.name,
    chainId: chainInfo.chainId
  })

  return provider
}
