import { useCallback } from 'react'
import {
  useArbQueryParams,
  DisabledFeatures,
  ModeParamEnum
} from './useArbQueryParams'

export const useDisabledFeatures = () => {
  const [{ disabledFeatures, mode }] = useArbQueryParams()

  const isFeatureDisabled = useCallback(
    (feature: DisabledFeatures) => {
      if (feature === DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS) {
        return mode === ModeParamEnum.EMBED
      }

      return (disabledFeatures as readonly DisabledFeatures[]).includes(feature)
    },
    [disabledFeatures]
  )

  return { isFeatureDisabled }
}
