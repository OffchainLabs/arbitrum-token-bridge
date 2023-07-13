import { utils } from 'ethers'

import { ExternalLink } from '../../common/ExternalLink'
import { shortenAddress } from '../../../util/CommonUtils'
import { getExplorerUrl } from '../../../util/networks'
import { MergedTransaction } from '../../../state/app/state'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'

export const TransactionsTableRowBanner = ({
  tx
}: {
  tx: MergedTransaction
}) => {
  const { l1, l2 } = useNetworksAndSigners()
  const chainId = (tx.isWithdrawal ? l2 : l1).network.id

  return (
    <div className="absolute rounded-tr-md -bottom-[1px] left-0 bg-black px-4 py-1 text-center text-sm text-white">
      Funds received from:{' '}
      <ExternalLink
        className="arb-hover underline"
        href={getExplorerUrl(chainId)}
      >
        {shortenAddress(tx.sender)}
      </ExternalLink>
    </div>
  )
}
