import useSWRImmutable from 'swr/immutable'
import { createConfig, getTransactionHistory } from '@lifi/sdk'
import { INTEGRATOR_ID } from '../pages/api/crosschain-transfers/lifi'

export function useLifiTransactionHistory({
  walletAddress
}: {
  walletAddress: string | undefined
}) {
  return useSWRImmutable(
    walletAddress
      ? ([walletAddress, 'useLifiTransactionHistory'] as const)
      : null,
    async ([walletAddress]) => {
      // Config need to be instantiated with the proper integrator id before calling getTransactionHistory
      createConfig({
        integrator: INTEGRATOR_ID
      })
      return getTransactionHistory({
        wallet: walletAddress
      }).then(response => response.transfers)
    }
  )
}
