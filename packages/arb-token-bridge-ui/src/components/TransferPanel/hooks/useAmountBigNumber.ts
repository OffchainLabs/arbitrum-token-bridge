import { constants, utils } from 'ethers'
import { useMemo } from 'react'

import { useSelectedTokenDecimals } from '../../../hooks/TransferPanel/useSelectedTokenDecimals'
import {
  sanitizeAmountQueryParam,
  useArbQueryParams
} from '../../../hooks/useArbQueryParams'
import { truncateExtraDecimals } from '../../../util/NumberUtils'

export function useAmountBigNumber() {
  const [{ amount }, setQueryParams] = useArbQueryParams()
  const selectedTokenDecimals = useSelectedTokenDecimals()

  return useMemo(() => {
    try {
      if (amount === '' || isNaN(Number(amount))) {
        return constants.Zero
      }

      const amountSafe = amount || '0'

      const sanitizedAmount = sanitizeAmountQueryParam(
        truncateExtraDecimals(amountSafe, selectedTokenDecimals)
      )

      if (amount !== sanitizedAmount) {
        setQueryParams({ amount: sanitizedAmount })
      }

      return utils.parseUnits(sanitizedAmount, selectedTokenDecimals)
    } catch (error) {
      return constants.Zero
    }
  }, [amount, selectedTokenDecimals, setQueryParams])
}
