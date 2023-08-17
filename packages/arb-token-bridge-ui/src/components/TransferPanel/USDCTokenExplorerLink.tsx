import React from 'react'
import { twMerge } from 'tailwind-merge'
import { getUSDCAddresses } from '../../state/cctpState'
import { getExplorerUrl } from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'

export function USDCTokenExplorerLink({
  children,
  token,
  className,
  onClick,
  networkId
}: React.PropsWithChildren<{
  token: 'USDC' | 'USDC.e'
  className?: string
  onClick?: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
  networkId: number
}>) {
  const explorerUrl = getExplorerUrl(networkId)
  const usdcAddresses = getUSDCAddresses(networkId)
  let usdcContractAddress: string

  // While this case should not happen, we have this safety to avoid crashes
  if (!usdcAddresses) {
    return <>children</>
  }

  if (token === 'USDC.e') {
    if ('USDC.e' in usdcAddresses) {
      usdcContractAddress = usdcAddresses[token]
    } else {
      return <>children</>
    }
  } else {
    usdcContractAddress = usdcAddresses[token]
  }

  return (
    <ExternalLink
      onClick={onClick}
      className={twMerge('arb-hover text-blue-link underline', className)}
      href={`${explorerUrl}/token/${usdcContractAddress}`}
    >
      {children}
    </ExternalLink>
  )
}
