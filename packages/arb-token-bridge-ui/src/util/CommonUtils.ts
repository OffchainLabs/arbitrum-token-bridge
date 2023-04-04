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

export const isLocalOrE2E =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_IS_E2E_TEST

export const isTestingEnvironment = !!window.Cypress
