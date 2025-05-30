import { useCallback } from 'react'
import { useArbQueryParams, DisabledFeatures } from './useArbQueryParams'

export const useDisabledFeatures = () => {
  const [{ disabledFeatures }] = useArbQueryParams()

  const isFeatureDisabled = useCallback(
    (feature: DisabledFeatures) => {
      return (disabledFeatures as readonly DisabledFeatures[]).includes(feature)
    },
    [disabledFeatures]
  )

  console.log('xxx disabledFeatures', disabledFeatures)

  return { isFeatureDisabled }
}
