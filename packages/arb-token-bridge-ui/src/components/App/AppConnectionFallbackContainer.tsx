import { InformationCircleIcon } from '@heroicons/react/24/outline'

import { ExternalLink } from '../common/ExternalLink'

function WalletConnectWarning() {
  return (
    <div className="mx-4 flex max-w-md flex-col gap-1 self-end rounded bg-cyan px-3 py-2 text-sm text-cyan-dark sm:mx-6">
      <div className="flex items-center gap-1">
        <InformationCircleIcon className="h-3 w-3 stroke-2" />
        <span className="font-normal">
          Potential connection issues with Safe
        </span>
      </div>
      <div>
        Users connecting using Safe should ensure <code>?sourceChain=</code> to
        be the Safe wallet&apos;s chain, e.g. <code>ethereum</code>,{' '}
        <code>arbitrum-one</code>, <code>sepolia</code>, or{' '}
        <code>arbitrum-sepolia</code>.
        <br />
        Note that ETH transfers with smart contract wallets are not supported
        yet. Please{' '}
        <ExternalLink
          className="underline hover:no-underline"
          href="https://help.safe.global/en/"
        >
          contact Safe support
        </ExternalLink>{' '}
        if you have any issues.
      </div>
    </div>
  )
}
