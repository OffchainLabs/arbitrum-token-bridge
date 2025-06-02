import { useCallback } from 'react'

import { DisabledFeatures, useArbQueryParams } from './useArbQueryParams'

export const useDisabledFeatures = () => {
  const [{ disabledFeatures }] = useArbQueryParams()

  const isFeatureDisabled = useCallback(
    (feature: DisabledFeatures) => {
      return (disabledFeatures as readonly DisabledFeatures[]).includes(feature)
    },
    [disabledFeatures]
  )

  return { isFeatureDisabled }
}
