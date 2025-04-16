import { useMemo } from 'react'
import { constants, utils } from 'ethers'

import { useSourceChainNativeCurrencyDecimals } from '../../../hooks/useSourceChainNativeCurrencyDecimals'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import {
  sanitizeAmountQueryParam,
  useArbQueryParams
} from '../../../hooks/useArbQueryParams'
import { truncateExtraDecimals } from '../../../util/NumberUtils'

export function useAmountBigNumber() {
  const [selectedToken] = useSelectedToken()
  const [{ amount }, setQueryParams] = useArbQueryParams()
  const nativeCurrencyDecimalsOnSourceChain =
    useSourceChainNativeCurrencyDecimals()

  return useMemo(() => {
    try {
      const sanitizedAmount = sanitizeAmountQueryParam(
        truncateExtraDecimals(
          amount,
          selectedToken?.decimals || nativeCurrencyDecimalsOnSourceChain
        )
      )

      if (amount !== sanitizedAmount) {
        setQueryParams({ amount: sanitizedAmount })
      }

      if (selectedToken) {
        return utils.parseUnits(sanitizedAmount, selectedToken.decimals)
      }

      return utils.parseUnits(
        sanitizedAmount,
        nativeCurrencyDecimalsOnSourceChain
      )
    } catch (error) {
      return constants.Zero
    }
  }, [
    amount,
    selectedToken,
    nativeCurrencyDecimalsOnSourceChain,
    setQueryParams
  ])
}
