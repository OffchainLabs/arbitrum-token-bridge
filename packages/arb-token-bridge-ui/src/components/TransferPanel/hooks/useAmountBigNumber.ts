import { useMemo } from 'react'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useAppState } from '../../../state'
import { constants, utils } from 'ethers'
import { useSourceChainNativeCurrencyDecimals } from '../../../hooks/useSourceChainNativeCurrencyDecimals'

export function useAmountBigNumber() {
  const {
    app: { selectedToken }
  } = useAppState()
  const [{ amount }] = useArbQueryParams()
  const nativeCurrencyDecimalsOnSourceChain =
    useSourceChainNativeCurrencyDecimals()

  return useMemo(() => {
    try {
      const amountSafe = amount || '0'

      if (selectedToken) {
        return utils.parseUnits(amountSafe, selectedToken.decimals)
      }

      return utils.parseUnits(amountSafe, nativeCurrencyDecimalsOnSourceChain)
    } catch (error) {
      return constants.Zero
    }
  }, [amount, selectedToken, nativeCurrencyDecimalsOnSourceChain])
}
