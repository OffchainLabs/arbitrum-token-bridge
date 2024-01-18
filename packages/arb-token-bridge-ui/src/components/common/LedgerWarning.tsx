import { ExternalLink } from './ExternalLink'

export function LedgerWarning() {
  return (
    <div className="m-3 flex max-w-md flex-col gap-4 self-end rounded-md bg-orange px-3 py-2 text-sm text-orange-dark">
      <div>
        The bridge currently does not support the Ledger wallet due to a{' '}
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
