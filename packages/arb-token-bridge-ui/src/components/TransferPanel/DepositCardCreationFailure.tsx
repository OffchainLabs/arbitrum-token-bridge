import { useCopyToClipboard } from 'react-use'
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'

import { ExternalLink } from '../common/ExternalLink'
import { MergedTransaction } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { DepositCardContainer } from './DepositCard'
import { shortenTxHash } from '../../util/CommonUtils'
import { GET_HELP_LINK } from '../../constants'
import { useChainLayers } from '../../hooks/useChainLayers'

// TODO: Remove after Nitro.
export function DepositCardCreationFailure({ tx }: { tx: MergedTransaction }) {
  const { l1, l2 } = useNetworksAndSigners()
  const { parentLayer, layer } = useChainLayers()
  const [, copyToClipboard] = useCopyToClipboard()

  return (
    <DepositCardContainer tx={tx}>
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
            `${parentLayer} transaction: ${l1.network.blockExplorers?.default.url}/tx/${tx.txId}\n${layer} transaction: ${l2.network.blockExplorers?.default.url}/tx/${tx.l1ToL2MsgData?.retryableCreationTxID}`
          )
        }}
      >
        <div className="flex flex-col">
          <span className="text-base text-brick-dark">
            {parentLayer} transaction:{' '}
            <span className="text-blue-link">{shortenTxHash(tx.txId)}</span>
          </span>
          <span className="text-base text-brick-dark">
            {layer} transaction:{' '}
            <span className="text-blue-link">
              {shortenTxHash(tx.l1ToL2MsgData?.retryableCreationTxID || '')}
            </span>
          </span>
        </div>
        <DocumentDuplicateIcon className="h-6 w-6 text-brick-dark" />
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
