import useSWRImmutable from 'swr/immutable'
import { getTransactionHistory } from '@lifi/sdk'

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
