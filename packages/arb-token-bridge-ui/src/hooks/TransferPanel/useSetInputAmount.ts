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

      setQueryParams({ amount: correctDecimalsAmount }, { debounce: true })
    },
    [decimals, setQueryParams]
  )

  const setAmount2 = useCallback(
    (newAmount: string) => {
      const correctDecimalsAmount = truncateExtraDecimals(newAmount, 18)

      setQueryParams({ amount2: correctDecimalsAmount }, { debounce: true })
    },
    [setQueryParams]
  )

  return { setAmount, setAmount2 }
}
