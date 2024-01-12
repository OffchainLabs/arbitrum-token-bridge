import * as Sentry from '@sentry/react'

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

export const createBlockExplorerUrlForToken = ({
  explorerLink,
  tokenAddress
}: {
  explorerLink: string | undefined
  tokenAddress: string | undefined
}): string | undefined => {
  if (!explorerLink) {
    return undefined
  }
  if (!tokenAddress) {
    return undefined
  }
  try {
    const url = new URL(explorerLink)
    url.pathname += `token/${tokenAddress}`
    return url.toString()
  } catch (error) {
    Sentry.captureException(error)
    return undefined
  }
}

export function lightenColor(color: string, percent: number) {
  const num = parseInt(color.slice(1), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    B = ((num >> 8) & 0x00ff) + amt,
    G = (num & 0x0000ff) + amt

  return `rgb(${Math.min(255, R)}, ${Math.min(255, B)}, ${Math.min(255, G)})`
}
