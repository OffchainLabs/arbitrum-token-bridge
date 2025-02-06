import { useMemo } from 'react'
import { constants, utils } from 'ethers'
import { useDebounce } from '@uidotdev/usehooks'

import { useSourceChainNativeCurrencyDecimals } from '../../../hooks/useSourceChainNativeCurrencyDecimals'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useSelectedTokenDecimals } from '../../../hooks/TransferPanel/useSelectedTokenDecimals'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { truncateExtraDecimals } from '../../../util/NumberUtils'

export function useAmountBigNumber() {
  const [selectedToken] = useSelectedToken()
  const decimals = useSelectedTokenDecimals()
  const [{ amount }] = useArbQueryParams()
  const debouncedAmount = useDebounce(amount, 300)
  const nativeCurrencyDecimalsOnSourceChain =
    useSourceChainNativeCurrencyDecimals()

  return useMemo(() => {
    if (isNaN(Number(debouncedAmount))) {
      return constants.Zero
    }

    const amountSafe = debouncedAmount || '0'

    const correctDecimalsAmount = truncateExtraDecimals(amountSafe, decimals)

    return utils.parseUnits(correctDecimalsAmount, decimals)
  }, [amount, selectedToken, nativeCurrencyDecimalsOnSourceChain])
}
