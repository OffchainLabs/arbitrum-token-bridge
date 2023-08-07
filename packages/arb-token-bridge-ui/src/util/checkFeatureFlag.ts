const featureKeys = ['example', 'other'] as const

type Feature = (typeof featureKeys)[number]
type FeatureMap = { [key in Feature]: boolean }

const searchParams = new URLSearchParams(window.location.search)
// Using "_" as a delimiter as it's the default in use-query-params's DelimitedArrayParam
// https://github.com/pbeshai/use-query-params/tree/master/packages/use-query-params#readme
const featureFlags = (searchParams.get('ff') ?? '').split('_')

const defaultFeatureMap: FeatureMap = {
  example: false,
  other: false
}

const featureMap: FeatureMap = featureKeys.reduce(
  // Iterate over the keys and set the value to true if it's in the array
  (acc, key) => ({ ...acc, [key]: featureFlags.includes(key) }),
  defaultFeatureMap
)

export function checkFeatureFlag(feature: Feature) {
  return featureMap[feature]
}
