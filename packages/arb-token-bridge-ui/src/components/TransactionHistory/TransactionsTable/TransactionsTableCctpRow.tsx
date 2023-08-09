import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../../state/app/state'
import { isCustomDestinationAddressTx } from '../../../state/app/utils'
import { StatusBadge } from '../../common/StatusBadge'
import { Tooltip } from '../../common/Tooltip'

function CctpWithdrawalRowStatus({ tx }: { tx: MergedTransaction }) {
  switch (tx.status) {
    case 'Unconfirmed':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green" aria-label="L2 Transaction Status">
            Success
          </StatusBadge>
          <StatusBadge variant="yellow" aria-label="L1 Transaction Status">
            Pending
          </StatusBadge>
        </div>
      )

    case 'Confirmed':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green" aria-label="L2 Transaction Status">
            Success
          </StatusBadge>
          <Tooltip content={<span>Funds are ready to be claimed on L1</span>}>
            <StatusBadge variant="yellow" aria-label="L1 Transaction Status">
              <InformationCircleIcon className="h-4 w-4" /> Confirmed
            </StatusBadge>
          </Tooltip>
        </div>
      )

    case 'Executed': {
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green" aria-label="L2 Transaction Status">
            Success
          </StatusBadge>
          <StatusBadge variant="green" aria-label="L1 Transaction Status">
            Success
          </StatusBadge>
        </div>
      )
    }

    case 'Failure':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="red" aria-label="L2 Transaction Status">
            Failed
          </StatusBadge>
        </div>
      )

    default:
      return null
  }
}

export function TransactionsTableCctpRow({
  tx,
  className
}: {
  tx: MergedTransaction
  className?: string
}) {
  const { l1, l2 } = useNetworksAndSigners()
  const { address } = useAccount()
  const customAddressTxPadding = useMemo(
    () => (isCustomDestinationAddressTx(tx) ? 'pb-11' : ''),
    [tx]
  )

  if (!tx.sender || !address) {
    return null
  }
  return (
    <tr
      className={twMerge(
        'relative bg-cyan text-sm text-dark even:bg-white',
        className
      )}
      data-testid={`cctp-withdrawal-row-${tx.txId}`}
    >
      <td className={twMerge('w-1/5 py-3 pl-6 pr-3', customAddressTxPadding)}>
        <CctpWithdrawalRowStatus tx={tx} />
      </td>

      <td>{tx.txId}</td>

      {/* <td className={twMerge('w-1/5 px-3 py-3', customAddressTxPadding)}>
        <WithdrawalRowTime tx={tx} />
      </td>

      <td
        className={twMerge(
          'w-1/5 whitespace-nowrap px-3 py-3',
          customAddressTxPadding
        )}
      >
        {formatAmount(Number(tx.value), {
          symbol: tokenSymbol
        })}
      </td>

      <td className={twMerge('w-1/5 px-3 py-3', customAddressTxPadding)}>
        <WithdrawalRowTxID tx={tx} />
      </td>

      <td
        className={twMerge(
          'relative w-1/5 py-3 pl-3 pr-6 text-right',
          customAddressTxPadding
        )}
      >
        <WithdrawalRowAction tx={tx} isError={isError} />
      </td>
      {isCustomDestinationAddressTx(tx) && (
        <TransactionsTableCustomAddressLabel tx={tx} />
      )} */}
    </tr>
  )
}
