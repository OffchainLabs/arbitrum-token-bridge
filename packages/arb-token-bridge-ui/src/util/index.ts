export enum ConnectionState {
  LOADING,
  L1_CONNECTED,
  L2_CONNECTED,
  NETWORK_ERROR
}

export const sanitizeImageSrc = (url: string): string => {
  if (url.startsWith('ipfs')) {
    return `https://ipfs.io/ipfs/${url.substring(7)}`
  }

  return url
}

export function preloadImages(imageSources: string[]) {
  imageSources.forEach(imageSrc => {
    const image = new Image()
    image.src = imageSrc
  })
}

export const loadEnvironmentVariableWithFallback = ({
  env,
  fallback
}: {
  env?: string
  fallback?: string
}): string => {
  const isValidEnv = (value?: string) => {
    return typeof value === 'string' && value.trim().length !== 0
  }
  if (isValidEnv(env)) {
    return String(env)
  }
  if (isValidEnv(fallback)) {
    return String(fallback)
  }
  throw new Error(
    `
      Neither the provided value or its fallback are a valid environment variable.
      Expected one of them to be a non-empty string but received env: '${env}', fallback: '${fallback}'.
    `
  )
}

export const sanitizeQueryParams = (data: any) => {
  return JSON.parse(JSON.stringify(data))
}

export const getAPIBaseUrl = () => {
  // if dev environment, eg. tests, then prepend actual running environment
  // Resolves: next-js-error-only-absolute-urls-are-supported in test:ci
  return process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : ''
}

type FeatureFlag = 'batch'

export const isExperimentalFeatureEnabled = (flag: FeatureFlag) => {
  const query = new URLSearchParams(window.location.search)
  const featureFlags = query.get('experiments')

  if (!featureFlags) {
    return false
  }

  if (!flag) {
    // we only want to check if any feature flag is enabled
    return true
  }

  return featureFlags.split(',').includes(flag)
}

export const isExperimentalModeEnabled = () => {
  const query = new URLSearchParams(window.location.search)
  const featureFlags = query.get('experiments')

  return featureFlags !== null
}
