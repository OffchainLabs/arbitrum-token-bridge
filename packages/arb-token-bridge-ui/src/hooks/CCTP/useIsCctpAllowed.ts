import useSWRImmutable from 'swr/immutable'
import { useCCTP, UseCCTPParams } from './useCCTP'

export function useIsCctpAllowed({ sourceChainId }: UseCCTPParams) {
  const { fetchAttestation } = useCCTP({ sourceChainId })

  const { data, isLoading } = useSWRImmutable(['cctp-check'], async () => {
    try {
      const response = await fetchAttestation('0x')
      return response.status !== 403
    } catch {
      return false
    }
  })

  return {
    data,
    isLoading
  }
}
