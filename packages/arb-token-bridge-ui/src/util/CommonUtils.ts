export function shortenAddress(address: string) {
  const addressLength = address.length

  return `${address.substring(0, 5)}...${address.substring(
    addressLength - 4,
    addressLength
  )}`
}

export function shortenTxHash(txHash: string) {
  const txHashLength = txHash.length

  return `${txHash.substring(0, 7)}...${txHash.substring(
    txHashLength - 4,
    txHashLength
  )}`
}

export const isE2eTestingEnvironment =
  typeof window !== 'undefined' && !!window.Cypress

export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development'

/**
 * Prints a log message based on the current environment.
 *
 * @param message - The message to be logged
 * @param options - Configuration options
 * @param options.development - Whether to show logs in development environment (default: true)
 * @param options.production - Whether to show logs in production environment (default: false)
 *
 */
export function printLog(
  message: any,
  {
    development = true,
    production = false
  }: { development?: boolean; production?: boolean } = {
    development: true,
    production: false
  }
) {
  const env = process.env.NODE_ENV

  if (
    (development && env === 'development') ||
    (production && env === 'production')
  ) {
    console.log(message)
  }
}
