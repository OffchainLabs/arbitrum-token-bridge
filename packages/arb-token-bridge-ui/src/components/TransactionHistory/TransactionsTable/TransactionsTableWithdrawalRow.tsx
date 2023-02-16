import { BigNumber } from 'ethers'

import { useAppState } from '../../../state'
import { MergedTransaction } from '../../../state/app/state'
import { StatusBadge } from '../../common/StatusBadge'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { useClaimWithdrawal } from '../../../hooks/useClaimWithdrawal'
import { WithdrawalCountdown } from '../../common/WithdrawalCountdown'
import { ExternalLink } from '../../common/ExternalLink'
import { shortenTxHash } from '../../../util/CommonUtils'
import { Button } from '../../common/Button'
import { Tooltip } from '../../common/Tooltip'
import { getExplorerUrl, getNetworkName } from '../../../util/networks'
import {
  DotsVerticalIcon,
  InformationCircleIcon
} from '@heroicons/react/outline'
import { isFathomNetworkName, trackEvent } from '../../../util/AnalyticsUtils'
import { GET_HELP_LINK } from '../../../constants'
import { useMemo } from 'react'
import { Popover } from '@headlessui/react'
import dayjs from 'dayjs'
import { isPending, TRANSACTIONS_DATE_FORMAT } from '../../../state/app/utils'

export function findMatchingL1Tx(
  l2ToL1Message: MergedTransaction,
  transactions: MergedTransaction[]
) {
  return transactions.find(_tx => {
    const l2ToL1MsgData = _tx.l2ToL1MsgData

    if (typeof l2ToL1MsgData === 'undefined') {
      return false
    }

    // To get rid of Proxy
    const txUniqueId = BigNumber.from(l2ToL1Message.uniqueId)
    const _txUniqueId = BigNumber.from(l2ToL1MsgData.uniqueId)

    return txUniqueId.eq(_txUniqueId)
  })
}

function WithdrawalRowStatus({
  tx,
  mergedTransactions
}: {
  tx: MergedTransaction
  mergedTransactions: MergedTransaction[]
}) {
  const matchingL1Tx = findMatchingL1Tx(tx, mergedTransactions)

  switch (tx.status) {
    case 'Unconfirmed':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="yellow">Pending</StatusBadge>
        </div>
      )

    case 'Confirmed':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <Tooltip content={<span>Funds are ready to be claimed on L1</span>}>
            <StatusBadge variant="yellow">
              Confirmed <InformationCircleIcon className="h-4 w-4" />
            </StatusBadge>
          </Tooltip>
        </div>
      )

    case 'Executed': {
      if (typeof matchingL1Tx === 'undefined') {
        return (
          <div className="flex flex-col space-y-1">
            <StatusBadge variant="green">Success</StatusBadge>
            <Tooltip
              content={
                <span>
                  Transaction successful: Funds have been claimed on L1, but the
                  corresponding transaction was not found
                </span>
              }
            >
              <StatusBadge variant="green">
                Executed
                <InformationCircleIcon className="h-4 w-4" />
              </StatusBadge>
            </Tooltip>
          </div>
        )
      }

      // TODO: Handle failure on L1
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="green">Success</StatusBadge>
        </div>
      )
    }

    default:
      return null
  }
}

function WithdrawalRowTime({
  tx,
  mergedTransactions
}: {
  tx: MergedTransaction
  mergedTransactions: MergedTransaction[]
}) {
  if (tx.status === 'Unconfirmed') {
    return (
      <WithdrawalCountdown
        nodeBlockDeadline={tx.nodeBlockDeadline || 'NODE_NOT_CREATED'}
      />
    )
  }

  if (tx.status === 'Confirmed') {
    return (
      <div className="flex flex-col">
        <Tooltip content={<span>Creation Time</span>}>
          <span className="whitespace-nowrap">{tx.createdAt || 'N/A'}</span>
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip content={<span>L1 Transaction</span>}>
            <span className="whitespace-nowrap">Ready</span>
          </Tooltip>
        )}
      </div>
    )
  }

  const matchingL1Tx = findMatchingL1Tx(tx, mergedTransactions)

  if (typeof matchingL1Tx === 'undefined') {
    return (
      <div className="flex flex-col">
        <Tooltip content={<span>L2 Transaction time</span>}>
          <span className="whitespace-nowrap">{tx.createdAt || 'N/A'}</span>
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip content={<span>Ready to claim funds on L1</span>}>
            <span className="whitespace-nowrap">N/A</span>
          </Tooltip>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      <Tooltip content={<span>Creation Time</span>}>
        <span className="whitespace-nowrap">{tx.createdAt || 'N/A'}</span>
      </Tooltip>
      {matchingL1Tx?.createdAt && (
        <Tooltip content={<span>L1 Transaction</span>}>
          <span className="whitespace-nowrap">
            {matchingL1Tx?.createdAt || 'N/A'}
          </span>
        </Tooltip>
      )}
    </div>
  )
}

function WithdrawalRowTxID({ tx }: { tx: MergedTransaction }) {
  const {
    app: { mergedTransactions }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()

  function L1TxInfo() {
    if (tx.status !== 'Executed') {
      return null
    }

    const matchingL1Tx = findMatchingL1Tx(tx, mergedTransactions)

    if (typeof matchingL1Tx === 'undefined') {
      return (
        <span className="whitespace-nowrap text-dark">
          {getNetworkName(l1.network.chainID)}: Not available
        </span>
      )
    }

    return (
      <span className="whitespace-nowrap text-dark">
        {getNetworkName(l1.network.chainID)}:{' '}
        <ExternalLink
          href={`${getExplorerUrl(l1.network.chainID)}/tx/${matchingL1Tx.txId}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(matchingL1Tx.txId)}
        </ExternalLink>
      </span>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      <span className="whitespace-nowrap text-dark">
        {getNetworkName(l2.network.chainID)}:{' '}
        <ExternalLink
          href={`${getExplorerUrl(l2.network.chainID)}/tx/${tx.txId}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(tx.txId)}
        </ExternalLink>
      </span>

      <L1TxInfo />
    </div>
  )
}

const GetHelpButton = ({
  variant,
  onClick
}: {
  variant: 'primary' | 'secondary'
  onClick: () => void
}) => {
  return (
    <Tooltip
      wrapperClassName=""
      content={<span>Transaction failed (EXECUTE_CALL_EXCEPTION)</span>}
    >
      <Button
        variant={variant}
        onClick={onClick}
        className={variant === 'secondary' ? 'bg-white px-4 py-3' : ''}
      >
        Get Help
      </Button>
    </Tooltip>
  )
}

function WithdrawalRowAction({
  tx,
  isError
}: {
  tx: MergedTransaction
  isError: boolean
}) {
  const {
    isConnectedToArbitrum,
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const { claim, isClaiming } = useClaimWithdrawal()
  const l2NetworkName = getNetworkName(l2Network.chainID)

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank')

    // track the button click
    if (isFathomNetworkName(l2NetworkName)) {
      trackEvent(`Tx error: Get Help clicked on ${l2NetworkName}`)
    }
  }

  if (tx.status === 'Unconfirmed') {
    return (
      <Tooltip
        wrapperClassName=""
        content={<span>Funds aren&apos;t ready to claim yet</span>}
      >
        <Button variant="primary" disabled>
          Claim
        </Button>
      </Tooltip>
    )
  }

  if (tx.status === 'Confirmed') {
    return (
      <Tooltip
        show={isConnectedToArbitrum || false}
        wrapperClassName=""
        content={
          <span>
            Please connect to the L1 network to claim your withdrawal.
          </span>
        }
      >
        <Button
          variant="primary"
          loading={isClaiming}
          disabled={isConnectedToArbitrum}
          onClick={() => claim(tx)}
        >
          Claim
        </Button>
      </Tooltip>
    )
  }

  if (isError) {
    const isTxOlderThan7Days =
      dayjs().diff(dayjs(tx.createdAt, TRANSACTIONS_DATE_FORMAT), 'days') > 7

    return (
      <>
        {isTxOlderThan7Days ? (
          // show a dropdown menu with the button
          <Popover>
            <Popover.Button>
              <DotsVerticalIcon className="h-6 w-6 cursor-pointer p-1 text-dark" />
            </Popover.Button>
            <Popover.Panel
              className={'absolute top-4 z-50 rounded-md bg-white shadow-lg'}
            >
              <GetHelpButton variant="secondary" onClick={getHelpOnError} />
            </Popover.Panel>
          </Popover>
        ) : (
          // show a normal button outside
          <GetHelpButton variant="primary" onClick={getHelpOnError} />
        )}
      </>
    )
  }

  return null
}

export function TransactionsTableWithdrawalRow({
  tx,
  className = ''
}: {
  tx: MergedTransaction
  className?: string
}) {
  const {
    app: { mergedTransactions }
  } = useAppState()

  const L2ToL1MessageStatuses = ['Unconfirmed', 'Confirmed', 'Executed']

  if (!L2ToL1MessageStatuses.includes(tx.status)) {
    return null
  }

  const isError = tx.nodeBlockDeadline === 'EXECUTE_CALL_EXCEPTION'

  const bgClassName = useMemo(() => {
    if (isError) return 'bg-brick'
    if (isPending(tx)) return 'bg-orange'
    return ''
  }, [tx, isError])

  return (
    <tr
      className={`text-sm text-dark ${
        !bgClassName && `bg-cyan even:bg-white`
      } ${bgClassName} ${className}`}
    >
      <td className="w-1/5 py-3 pl-6 pr-3">
        <WithdrawalRowStatus tx={tx} mergedTransactions={mergedTransactions} />
      </td>

      <td className="w-1/5 px-3 py-3">
        <WithdrawalRowTime tx={tx} mergedTransactions={mergedTransactions} />
      </td>

      <td className="w-1/5 whitespace-nowrap px-3 py-3">
        {tx.value} {tx.asset.toUpperCase()}
      </td>

      <td className="w-1/5 px-3 py-3">
        <WithdrawalRowTxID tx={tx} />
      </td>

      <td className="relative w-1/5 py-3 pl-3 pr-6 text-right">
        <WithdrawalRowAction tx={tx} isError={isError} />
      </td>
    </tr>
  )
}
