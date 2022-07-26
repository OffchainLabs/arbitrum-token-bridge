import { useCopyToClipboard } from 'react-use'
import { ClipboardCopyIcon } from '@heroicons/react/outline'

import { ExternalLink } from '../common/ExternalLink'
import { MergedTransaction } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { shortenTxHash } from '../../util/CommonUtils'
import { DepositCardContainer } from './DepositCard'
import { GET_HELP_LINK } from '../../constants'

export function DepositCardL1Failure({ tx }: { tx: MergedTransaction }) {
  const { l1 } = useNetworksAndSigners()
  const [, copyToClipboard] = useCopyToClipboard()

  return (
    <DepositCardContainer tx={tx} dismissable>
      <span className="text-4xl font-semibold text-brick-dark">
        Something went wrong
      </span>

      <p className="text-2xl font-light text-brick-dark">
        No worries, we got you.
        <br />
        Just paste the following information into a help request:
      </p>

      <button
        className="arb-hover flex max-w-md flex-row items-center justify-between rounded-xl border border-brick-dark px-6 py-4"
        style={{ background: 'rgba(118, 39, 22, 0.2)' }}
        onClick={() => {
          copyToClipboard(
            `L1 transaction: ${l1.network?.explorerUrl}/tx/${tx.txId}`
          )
        }}
      >
        <span className="text-lg text-brick-dark">
          L1 transaction:{' '}
          <span className="text-blue-link">{shortenTxHash(tx.txId)}</span>
        </span>
        <ClipboardCopyIcon className="h-6 w-6 text-brick-dark" />
      </button>

      <div className="h-2" />
      <ExternalLink
        href={GET_HELP_LINK}
        className="arb-hover w-max rounded-lg bg-dark px-4 py-3 text-2xl text-white"
      >
        Get Help
      </ExternalLink>
    </DepositCardContainer>
  )
}
