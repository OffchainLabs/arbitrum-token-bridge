import { useSelectedToken } from '../useSelectedToken'
import { useSourceChainNativeCurrencyDecimals } from '../useSourceChainNativeCurrencyDecimals'

export function useSelectedTokenDecimals() {
  const [selectedToken] = useSelectedToken()
  const nativeCurrencyDecimalsOnSourceChain =
    useSourceChainNativeCurrencyDecimals()

  return selectedToken
    ? selectedToken.decimals
    : nativeCurrencyDecimalsOnSourceChain
}
