import { useArbQueryParams, DisabledFeatures } from './useArbQueryParams'

export function useDisabledFeatures() {
  const [{ disabledFeatures }] = useArbQueryParams()

  const isFeatureDisabled = (feature: DisabledFeatures) => {
    return (disabledFeatures as DisabledFeatures[]).includes(feature)
  }

  return {
    isFeatureDisabled
  }
}
