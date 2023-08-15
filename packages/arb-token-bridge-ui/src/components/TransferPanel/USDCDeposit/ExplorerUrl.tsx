import React from 'react'
import { twMerge } from 'tailwind-merge'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { getUSDCAddresses } from '../../../state/cctpState'
import { getExplorerUrl } from '../../../util/networks'
import { ExternalLink } from '../../common/ExternalLink'

export function ExplorerUrl({
  children,
  token,
  className,
  onClick
}: React.PropsWithChildren<{
  token: 'USDC' | 'USDC.e'
  className?: string
  onClick?: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
}>) {
  const { l2 } = useNetworksAndSigners()
  const explorerUrl = getExplorerUrl(l2.network.id)
  const usdcAddresses = getUSDCAddresses(l2.network.id)

  return (
    <ExternalLink
      onClick={onClick}
      className={twMerge('arb-hover text-blue-link underline', className)}
      href={`${explorerUrl}/token/${usdcAddresses[token]}`}
    >
      {children}
    </ExternalLink>
  )
}
