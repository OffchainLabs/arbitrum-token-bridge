import { getTransactionHistory } from '@lifi/sdk'
import useSWRImmutable from 'swr/immutable'

export function useLifiTransactionHistory({
  walletAddress
}: {
  walletAddress: string | undefined
}) {
  return useSWRImmutable(
    walletAddress
      ? ([walletAddress, 'useLifiTransactionHistory'] as const)
      : null,
    ([walletAddress]) =>
      getTransactionHistory({
        wallet: walletAddress
      }).then(response => response.transfers)
  )
}
