import { useCallback } from 'react'

import { truncateExtraDecimals } from '../../util/NumberUtils'
import { useArbQueryParams } from '../useArbQueryParams'
import { useSelectedTokenDecimals } from './useSelectedTokenDecimals'

export function useSetInputAmount() {
  const [, setQueryParams] = useArbQueryParams()
  const decimals = useSelectedTokenDecimals()

  const setAmount = useCallback(
    (newAmount: string) => {
      const correctDecimalsAmount = truncateExtraDecimals(newAmount, decimals)

      setQueryParams({ amount: correctDecimalsAmount })
    },
    [decimals, setQueryParams]
  )

  const setAmount2 = useCallback(
    (newAmount: string) => setQueryParams({ amount2: newAmount }),
    [setQueryParams]
  )

  return { setAmount, setAmount2 }
}
