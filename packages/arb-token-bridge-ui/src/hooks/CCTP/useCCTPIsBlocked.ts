import useSWRImmutable from 'swr/immutable'
import { ChainId } from '../../util/networks'
import { useCCTP } from './useCCTP'

export function useCCTPIsBlocked() {
  const { fetchAttestation } = useCCTP({ sourceChainId: ChainId.Mainnet })

  return useSWRImmutable(['cctp-check'], async () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful
    // Circle API returns 403 with Cors error for unauthorized users which throws instantly.
    // All successful calls are assumed to be authorized users
    try {
      await fetchAttestation('0x')
      return false
    } catch {
      return true
    }
  })
}
