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

export const isTestingEnvironment =
  !!window.Cypress || process.env.NODE_ENV !== 'production'

export const removeLinkForwardSlash = (link: string) => {
  if (link.endsWith('/')) {
    return link.substring(0, link.length - 1)
  }
  return link
}
