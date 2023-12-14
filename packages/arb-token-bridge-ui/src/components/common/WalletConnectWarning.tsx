import { GET_HELP_LINK } from '../../constants'
import { ExternalLink } from './ExternalLink'

export function WalletConnectWarning() {
  return (
    <div className="m-3 flex max-w-md flex-col gap-4 self-end rounded-md bg-cyan px-3 py-2 text-sm text-cyan-dark">
      <div>
        Users connecting to the site using WalletConnect may experience errors
        due to their new upgrade. Please{' '}
        <ExternalLink
          className="underline hover:no-underline"
          href={GET_HELP_LINK}
        >
          contact support
        </ExternalLink>{' '}
        if you have any issues.
      </div>
      <div>
        The bridge is currently not supporting the Ledger wallet due to a{' '}
        <ExternalLink
          href="https://twitter.com/Ledger/status/1735291427100455293"
          className="arb-hover underline"
        >
          recent upgrade
        </ExternalLink>{' '}
        that may compromise security. Please use other wallets in the meantime.
      </div>
    </div>
  )
}
