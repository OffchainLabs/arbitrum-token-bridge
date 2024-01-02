import { useMemo } from 'react'
import { useAccount } from 'wagmi'

import { MergedTransaction } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { isCustomDestinationAddressTx } from '../../state/app/utils'
import { ExternalLink } from '../common/ExternalLink'
import { getExplorerUrl } from '../../util/networks'
import { shortenAddress } from '../../util/CommonUtils'

export const CustomAddressTxExplorer = ({
  tx,
  explorerClassName = 'arb-hover underline'
}: {
  tx: Pick<MergedTransaction, 'sender' | 'destination' | 'isWithdrawal'>
  explorerClassName?: string
}) => {
  const { address } = useAccount()
  const { l1, l2 } = useNetworksAndSigners()

  const isFromDifferentSender = useMemo(() => {
    if (!tx.sender || !address) {
      return false
    }
    return tx.sender.toLowerCase() !== address.toLowerCase()
  }, [tx.sender, address])

  const isToDifferentRecipient = useMemo(() => {
    if (!address || !tx.destination) {
      return false
    }
    return tx.destination.toLowerCase() !== address.toLowerCase()
  }, [tx.destination, address])

  const explorerChainId = useMemo(() => {
    if (!isFromDifferentSender && !isToDifferentRecipient) {
      // transaction is not initiated by a different address and not sent to a different address
      // which means it is sent to the same account
      // do not show the custom address label
      return null
    }

    if (tx.isWithdrawal) {
      // this is a withdrawal, so
      // if it's a different sender, show their L2 address (where the withdrawal originated)
      // otherwise it's a custom destination, show their L1 address (where the funds will land)
      return isFromDifferentSender ? l2.network.id : l1.network.id
    }

    // this is a deposit, so
    // if it's a different sender, show their L1 address (where the deposit originated)
    // otherwise it's a custom destination, show their L2 address (where the funds will land)
    return isFromDifferentSender ? l1.network.id : l2.network.id
  }, [isFromDifferentSender, isToDifferentRecipient, l1, l2, tx])

  if (!explorerChainId || !isCustomDestinationAddressTx(tx)) {
    return null
  }

  if (!tx.sender || !tx.destination) {
    return null
  }

  return (
    <>
      {isFromDifferentSender ? (
        <span>Funds received from: </span>
      ) : (
        <span>Funds sent to: </span>
      )}
      <ExternalLink
        className={explorerClassName}
        href={`${getExplorerUrl(explorerChainId)}/address/${
          isFromDifferentSender ? tx.sender : tx.destination
        }`}
      >
        {shortenAddress(isFromDifferentSender ? tx.sender : tx.destination)}
      </ExternalLink>
    </>
  )
}

export const TransactionsTableCustomAddressLabel = ({
  tx
}: {
  tx: MergedTransaction
}) => {
  return (
    <div className="absolute bottom-2 left-6 translate-x-0 rounded-md bg-black px-4 py-1 text-center text-sm text-white sm:left-[50%] sm:-translate-x-[50%]">
      <CustomAddressTxExplorer tx={tx} />
    </div>
  )
}
