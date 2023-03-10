import { ExternalLink } from '../common/ExternalLink'
import { isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import useTwitter from '../../hooks/useTwitter'
import { InformationCircleIcon } from '@heroicons/react/outline'

function NotificationContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 flex w-full justify-center bg-black lg:mb-6">
      <div className="w-full max-w-[1440px] lg:px-8">
        <div className="flex w-full flex-wrap gap-2">{children}</div>
      </div>
    </div>
  )
}

function Notification({
  infoIcon,
  children
}: {
  infoIcon?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex w-auto gap-2 whitespace-nowrap rounded-md bg-dark p-2 px-4 text-sm text-cyan">
      {infoIcon && (
        <InformationCircleIcon
          className="h-5 w-5 text-gray-10"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  )
}

function ArbitrumBetaNotification() {
  return (
    <Notification infoIcon>
      Arbitrum is in beta.{' '}
      <ExternalLink
        href="https://developer.offchainlabs.com/docs/mainnet#some-words-of-caution"
        className="arb-hover mx-2 underline"
      >
        Learn more.
      </ExternalLink>
    </Notification>
  )
}

function NitroDevnetNotification() {
  const handleTwitterClick = useTwitter()

  return (
    <>
      <Notification infoIcon>
        <ExternalLink
          href="https://consensys.zendesk.com/hc/en-us/articles/7277996058395"
          className="arb-hover"
        >
          What is Nitro Testnet?
        </ExternalLink>
      </Notification>
      <Notification>
        <button onClick={handleTwitterClick} className="arb-hover text-left">
          Request ETH from the Nitro Testnet Twitter faucet!
        </button>
      </Notification>
    </>
  )
}

export function Notifications() {
  const { l1 } = useNetworksAndSigners()
  const { isMainnet, isGoerli } = isNetwork(l1.network.chainID)

  return (
    <NotificationContainer>
      {isMainnet && <ArbitrumBetaNotification />}
      {isGoerli && <NitroDevnetNotification />}
    </NotificationContainer>
  )
}
