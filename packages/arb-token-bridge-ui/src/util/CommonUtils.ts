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

export const isDevelopmentEnvironment =
  isE2eTestingEnvironment || process.env.NODE_ENV !== 'production' // Test env = E2E or any development (non-preview/prod environment)
