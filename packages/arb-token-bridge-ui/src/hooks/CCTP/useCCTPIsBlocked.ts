import useSWRImmutable from 'swr/immutable'
import { ChainId } from '../../util/networks'
import { useCCTP } from './useCCTP'

export function useCCTPIsBlocked() {
  const { fetchAttestation } = useCCTP({ sourceChainId: ChainId.Mainnet })

  return useSWRImmutable(['cctp-check'], async () => {
    try {
      await fetchAttestation('0x')
      return false
    } catch {
      return true
    }
  })
}
