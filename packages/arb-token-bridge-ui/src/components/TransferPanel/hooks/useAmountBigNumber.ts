import { useMemo } from 'react'
import { constants, utils } from 'ethers'

import {
  sanitizeAmountQueryParam,
  useArbQueryParams
} from '../../../hooks/useArbQueryParams'
import { truncateExtraDecimals } from '../../../util/NumberUtils'
import { useSelectedTokenDecimals } from '../../../hooks/TransferPanel/useSelectedTokenDecimals'

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
        setQueryParams({ amount: sanitizedAmount }, { debounce: true })
      }

      return utils.parseUnits(sanitizedAmount, selectedTokenDecimals)
    } catch (error) {
      return constants.Zero
    }
  }, [amount, selectedTokenDecimals, setQueryParams])
}
