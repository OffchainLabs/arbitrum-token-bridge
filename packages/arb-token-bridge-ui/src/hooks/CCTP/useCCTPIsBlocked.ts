import useSWRImmutable from 'swr/immutable'
import { ChainId } from '../../util/networks'
import { getCctpUtils } from '@/token-bridge-sdk/cctp'

export function useCCTPIsBlocked() {
  const { fetchAttestation } = getCctpUtils({ sourceChainId: ChainId.Ethereum })
  return useSWRImmutable(['cctp-check'], async () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful
    // Circle API returns 403 with Cors error for unauthorized users which throws instantly.
    // All successful calls are assumed to be authorized users
    try {
      await fetchAttestation('0x')
      return false
    } catch (_) {
      return true
    }
  })
}
