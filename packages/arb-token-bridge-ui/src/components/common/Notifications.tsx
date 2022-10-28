import { ExternalLink } from '../common/ExternalLink'
import { isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import useTwitter from '../../hooks/useTwitter'

function NotificationContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full justify-center bg-black lg:mb-6">
      <div className="w-full max-w-[1440px] lg:px-8">
        <div className="flex w-full">{children}</div>
      </div>
    </div>
  )
}

function Notification({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-3 px-3 text-cyan lg:w-auto lg:py-1 lg:text-sm">
      {children}
    </div>
  )
}

function ArbitrumBetaNotification() {
  return (
    <Notification>
      <span>
        Arbitrum is in beta.{' '}
        <ExternalLink
          href="https://developer.offchainlabs.com/docs/mainnet#some-words-of-caution"
          className="arb-hover underline"
        >
          Learn more.
        </ExternalLink>
      </span>
    </Notification>
  )
}

function RinkebyTestnetNotification() {
  return (
    <Notification>
      Rinkeby is being deprecated. Please use Goerli instead.{' '}
      <ExternalLink
        href="https://medium.com/offchainlabs/new-g%C3%B6rli-testnet-and-getting-rinkeby-ready-for-nitro-3ff590448053"
        className="arb-hover underline"
      >
        Learn more.
      </ExternalLink>
    </Notification>
  )
}

function NitroDevnetNotification() {
  const handleTwitterClick = useTwitter()

  return (
    <Notification>
      <ExternalLink
        href="https://consensys.zendesk.com/hc/en-us/articles/7277996058395"
        className="arb-hover underline"
      >
        What is Nitro Testnet?
      </ExternalLink>{' '}
      <button
        onClick={handleTwitterClick}
        className="arb-hover text-left underline"
      >
        Request ETH from the Nitro Testnet Twitter faucet!
      </button>
    </Notification>
  )
}

export function Notifications() {
  const { l1 } = useNetworksAndSigners()
  const { isMainnet, isRinkeby, isGoerli } = isNetwork(l1.network.chainID)

  return (
    <NotificationContainer>
      {isMainnet && <ArbitrumBetaNotification />}
      {isRinkeby && <RinkebyTestnetNotification />}
      {isGoerli && <NitroDevnetNotification />}
    </NotificationContainer>
  )
}
