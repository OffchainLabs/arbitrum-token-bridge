type Feature = 'example' | 'other'

const searchParams = new URLSearchParams(window.location.search)
// Using "_" as a delimiter as it's the default in use-query-params's DelimitedArrayParam
// https://github.com/pbeshai/use-query-params/tree/master/packages/use-query-params#readme
const featureFlags = (searchParams.get('ff') ?? '').split('_')

export function checkFeatureFlag(feature: Feature) {
  return featureFlags.includes(feature)
}
