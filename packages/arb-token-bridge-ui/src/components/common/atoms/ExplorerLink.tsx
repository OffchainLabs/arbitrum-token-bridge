import { twMerge } from 'tailwind-merge'

import { shortenAddress, shortenTxHash } from '../../../util/CommonUtils'
import { ExternalLink } from '../ExternalLink'
import { PropsWithChildren } from 'react'

const ExplorerLink = ({
  explorerUrl,
  txId,
  address,
  tokenAddress,
  className,
  children
}: PropsWithChildren<{
  explorerUrl: string | undefined
  txId?: string
  address?: string
  tokenAddress?: string
  className?: string
}>) => {
  const shortenedAddress = shortenAddress(address ?? '')
  const addressLink = `${explorerUrl}/address/${address}`
  const shortenedTxHash = shortenTxHash(txId ?? '')
  const txLink = `${explorerUrl}/tx/${txId}`
  const tokenAddressLink = `${explorerUrl}/token/${tokenAddress}`

  if (!explorerUrl) {
    if (address) {
      return shortenedAddress
    }
    if (txId) {
      return shortenedTxHash
    }
    if (tokenAddress) {
      return tokenAddress
    }
  }

  if (tokenAddress) {
    return (
      <ExternalLink
        href={tokenAddressLink}
        className={twMerge('arb-hover text-blue-link', className)}
      >
        {tokenAddress}
        {children}
      </ExternalLink>
    )
  }

  return (
    <ExternalLink
      href={address ? addressLink : txLink}
      className={twMerge('arb-hover text-blue-link', className)}
    >
      {address ? shortenedAddress : shortenedTxHash}
      {children}
    </ExternalLink>
  )
}

export const ExplorerTxLink = ({
  explorerUrl,
  txId,
  className,
  children
}: PropsWithChildren<{
  explorerUrl: string | undefined
  txId: string
  className?: string
}>) => (
  <ExplorerLink explorerUrl={explorerUrl} txId={txId} className={className}>
    {children}
  </ExplorerLink>
)

export const ExplorerAddressLink = ({
  explorerUrl,
  address,
  className
}: {
  explorerUrl: string | undefined
  address: string
  className?: string
}) => (
  <ExplorerLink
    explorerUrl={explorerUrl}
    address={address}
    className={className}
  />
)

export const ExplorerTokenLink = ({
  explorerUrl,
  tokenAddress,
  className
}: {
  explorerUrl: string | undefined
  tokenAddress: string
  className?: string
}) => (
  <ExplorerLink
    explorerUrl={explorerUrl}
    tokenAddress={tokenAddress}
    className={className}
  />
)
