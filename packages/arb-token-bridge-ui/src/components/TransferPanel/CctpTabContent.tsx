import { PropsWithChildren } from 'react'
import { CCTP_DOCUMENTATION } from '../../constants'
import { useCCTPIsBlocked } from '../../hooks/CCTP/useCCTPIsBlocked'
import { ExternalLink } from '../common/ExternalLink'
import { getExplorerUrl, getNetworkName } from '../../util/networks'
import { CCTPSupportedChainId, getUSDCAddresses } from '../../state/cctpState'

export const CctpTabContent = ({
  destinationChainId,
  children
}: PropsWithChildren<{
  destinationChainId: CCTPSupportedChainId
}>) => {
  const { data: isCctpBlocked, isLoading: isLoadingIsCctpBlocked } =
    useCCTPIsBlocked()

  if (isLoadingIsCctpBlocked || isCctpBlocked) {
    return (
      <p className="font-light">
        Access to Circle&apos;s bridge is restricted in certain jurisdictions.
        For more details, please consult Circle&apos;s{' '}
        <ExternalLink className="arb-hover underline" href={CCTP_DOCUMENTATION}>
          documentation.
        </ExternalLink>{' '}
      </p>
    )
  }

  return (
    <>
      <p className="font-light">
        Receive{' '}
        <ExternalLink
          className="arb-hover underline"
          href={`${getExplorerUrl(destinationChainId)}/token/${
            getUSDCAddresses(destinationChainId).USDC
          }`}
        >
          Native USDC
        </ExternalLink>{' '}
        on {getNetworkName(destinationChainId)} with Circle&apos;s{' '}
        <ExternalLink className="arb-hover underline" href={CCTP_DOCUMENTATION}>
          Cross-Chain Transfer Protocol
        </ExternalLink>{' '}
        within the Arbitrum Bridge.
      </p>
      {children}
    </>
  )
}
