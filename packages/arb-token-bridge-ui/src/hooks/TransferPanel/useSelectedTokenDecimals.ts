import { useAppState } from '../../state'
import { useSourceChainNativeCurrencyDecimals } from '../useSourceChainNativeCurrencyDecimals'

export function useSelectedTokenDecimals() {
  const {
    app: { selectedToken }
  } = useAppState()
  const nativeCurrencyDecimalsOnSourceChain =
    useSourceChainNativeCurrencyDecimals()

  return selectedToken
    ? selectedToken.decimals
    : nativeCurrencyDecimalsOnSourceChain
}
