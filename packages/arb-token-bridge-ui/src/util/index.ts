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

// add feature flags to the array
const featureFlags = [] as const

type FeatureFlag = (typeof featureFlags)[number]

export const isExperimentalFeatureEnabled = (flag: FeatureFlag) => {
  const query = new URLSearchParams(window.location.search)
  const flags = query.get('experiments')

  if (!flags) {
    return false
  }

  return flags.split(',').includes(flag)
}

export const isExperimentalModeEnabled = () => {
  const query = new URLSearchParams(window.location.search)
  const flags = query.get('experiments')

  return flags !== null
}

export const sanitizeExperimentalFeaturesQueryParam = (
  flags: string | null | undefined
) => {
  if (!flags) {
    return undefined
  }

  const flagsArray = flags.split(',')

  if (flagsArray.length === 0) {
    return undefined
  }

  const validFlagsArray = flagsArray.filter(f =>
    featureFlags.includes(f as FeatureFlag)
  )

  if (validFlagsArray.length === 0) {
    return undefined
  }

  return validFlagsArray.join(',')
}
