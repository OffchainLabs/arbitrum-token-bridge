import { useMemo } from 'react'
import { useAccount } from 'wagmi'

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
  const { address } = useAccount()
  const { l1, l2 } = useNetworksAndSigners()

  const isCustomSenderTx = useMemo(() => {
    if (!address) {
      return false
    }
    return tx.sender.toLowerCase() !== address.toLowerCase()
  }, [tx.sender, address])

  const isCustomDestinationTx = useMemo(() => {
    if (!address) {
      return false
    }
    return tx.destination.toLowerCase() !== address.toLowerCase()
  }, [tx.destination, address])

  const explorerChainId = useMemo(() => {
    if (!isCustomSenderTx && !isCustomDestinationTx) {
      return null
    }
    if (tx.isWithdrawal) {
      if (isCustomSenderTx) {
        return l2.network.id
      }
      return l1.network.id
    }
    if (isCustomSenderTx) {
      return l1.network.id
    }
    return l2.network.id
  }, [isCustomSenderTx, isCustomDestinationTx, l1, l2])

  if (!explorerChainId) {
    return null
  }

  if (!isCustomSenderTx && !isCustomDestinationTx) {
    return null
  }

  return (
    <div className="absolute -bottom-[1px] left-0 rounded-tr-md bg-black px-4 py-1 text-center text-sm text-white">
      {isCustomSenderTx ? (
        <span>Funds received from: </span>
      ) : (
        <span>Funds sent to: </span>
      )}
      <ExternalLink
        className="arb-hover underline"
        href={getExplorerUrl(explorerChainId)}
      >
        {shortenAddress(isCustomSenderTx ? tx.sender : tx.destination)}
      </ExternalLink>
    </div>
  )
}
