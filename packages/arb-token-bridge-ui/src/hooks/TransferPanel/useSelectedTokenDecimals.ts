import { useAppState } from '../../state'
import { useNativeCurrencyDecimalsOnSourceChain } from '../useNativeCurrencyDecimalsOnSourceChain'

export function useSelectedTokenDecimals() {
  const {
    app: { selectedToken }
  } = useAppState()
  const nativeCurrencyDecimalsOnSourceChain =
    useNativeCurrencyDecimalsOnSourceChain()

  return selectedToken
    ? selectedToken.decimals
    : nativeCurrencyDecimalsOnSourceChain
}
