import { useMemo } from 'react'
import { constants, utils } from 'ethers'
import { useDebounce } from '@uidotdev/usehooks'

import {
  sanitizeAmountQueryParam,
  useArbQueryParams
} from '../../../hooks/useArbQueryParams'
import { truncateExtraDecimals } from '../../../util/NumberUtils'
import { useSelectedTokenDecimals } from '../../../hooks/TransferPanel/useSelectedTokenDecimals'

export function useAmountBigNumber() {
  const [{ amount }, setQueryParams] = useArbQueryParams()
  const debouncedAmount = useDebounce(amount, 300)
  const selectedTokenDecimals = useSelectedTokenDecimals()

  return useMemo(() => {
    try {
      if (isNaN(Number(debouncedAmount))) {
        return constants.Zero
      }

      const amountSafe = debouncedAmount || '0'

      const sanitizedAmount = sanitizeAmountQueryParam(
        truncateExtraDecimals(amountSafe, selectedTokenDecimals)
      )

      if (debouncedAmount !== sanitizedAmount) {
        setQueryParams({ amount: sanitizedAmount })
      }

      return utils.parseUnits(sanitizedAmount, selectedTokenDecimals)
    } catch (error) {
      return constants.Zero
    }
  }, [amount, selectedTokenDecimals, setQueryParams])
}
