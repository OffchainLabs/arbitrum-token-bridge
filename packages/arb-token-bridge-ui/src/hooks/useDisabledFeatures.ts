import { useCallback } from 'react'
import { useArbQueryParams, DisabledFeatures } from './useArbQueryParams'

export const useDisabledFeatures = () => {
  const [{ disabledFeatures, mode }] = useArbQueryParams()

  const isFeatureDisabled = useCallback(
    (feature: DisabledFeatures) => {
      if (feature === DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS) {
        return typeof mode !== 'undefined'
      }

      return (disabledFeatures as readonly DisabledFeatures[]).includes(feature)
    },
    [disabledFeatures]
  )

  return { isFeatureDisabled }
}
