import { PropsWithChildren } from 'react'
import { CCTP_DOCUMENTATION } from '../../constants'
import { useCCTPIsBlocked } from '../../hooks/CCTP/useCCTPIsBlocked'
import { ExternalLink } from '../common/ExternalLink'

export const CctpTabContent = ({
  toNetworkName,
  children
}: PropsWithChildren<{
  toNetworkName: string
}>) => {
  const { data: isCctpBlocked, isLoading: isLoadingIsCctpBlocked } =
    useCCTPIsBlocked()

  if (isLoadingIsCctpBlocked || isCctpBlocked) {
    return (
      <p className="font-light">
        Access to Circle&apos;s bridge is restricted in certain jurisdictions.
        For more details, please consult Circle&apos;s{' '}
        <ExternalLink
          className="arb-hover text-blue-link underline"
          href={CCTP_DOCUMENTATION}
        >
          documentation.
        </ExternalLink>{' '}
      </p>
    )
  }

  return (
    <>
      <p className="font-light">
        Receive Native USDC on {toNetworkName} with Circle&apos;s{' '}
        <ExternalLink
          className="arb-hover text-blue-link underline"
          href={CCTP_DOCUMENTATION}
        >
          Cross-Chain Transfer Protocol
        </ExternalLink>{' '}
        within the Arbitrum Bridge.
      </p>
      {children}
    </>
  )
}
