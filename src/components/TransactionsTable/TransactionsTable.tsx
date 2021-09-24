import React, { useMemo, useCallback } from 'react'

import dayjs from 'dayjs'
import Countdown from 'react-countdown'
import { useAppState } from 'src/state'
import { Network } from 'src/util/networks'
import { TxnType } from 'token-bridge-sdk'
import { TxnStatus } from 'token-bridge-sdk/dist/hooks/useTransactions'

import { MergedTransaction } from '../../state/app/state'
import { Button } from '../common/Button'
import ExplorerLink from '../common/ExplorerLink'
import { StatusBadge } from '../common/StatusBadge'
import { Tooltip } from '../common/Tooltip'

interface TransactionsTableProps {
  transactions: MergedTransaction[]
  overflowX?: boolean
}

const StatusMappings: Record<TxnStatus, string> = {
  pending: 'Processing',
  success: 'Success',
  confirmed: 'Confirmed',
  failure: 'Failed'
}

const PendingCountdown = ({ tx }: { tx: MergedTransaction }): JSX.Element => {
  const now = dayjs()
  const whenCreated = dayjs(tx?.createdAt)
  const diffInSeconds = now.diff(whenCreated, 'seconds')

  return (
    <Countdown
      date={now
        .add(
          tx.direction === 'deposit-l2'
            ? Math.max(10 * 60 - diffInSeconds + 2, 0)
            : Math.max(3 * 60 - diffInSeconds + 2, 0),
          'seconds'
        )
        .toDate()}
      renderer={({ hours, minutes, seconds, completed }) => {
        // if (completed) {
        //   // Render a completed state
        //   return <>Done</>
        // }
        // Render a countdown
        if (tx.direction === 'deposit-l1') {
          return (
            <span className="text-bright-blue">
              {minutes}:{seconds} Seconds
            </span>
          )
        }
        return (
          <span className="text-bright-blue">
            {hours}:{minutes} Mins
          </span>
        )
      }}
    />
  )
}

const TableRow = ({ tx }: { tx: MergedTransaction }): JSX.Element => {
  const {
    app: {
      arbTokenBridge,
      l1NetworkDetails,
      l2NetworkDetails,
      isDepositMode,
      currentL1BlockNumber,
      seqNumToAutoRedeems,
      bridge,
      networkDetails
    }
  } = useAppState()

  const showRedeemRetryableButton = useMemo(() => {
    return (
      tx.direction === 'deposit-l2' &&
      tx.asset !== 'eth' &&
      tx.seqNum !== undefined &&
      seqNumToAutoRedeems[tx.seqNum] &&
      seqNumToAutoRedeems[tx.seqNum].status === 'failure'
    )
  }, [seqNumToAutoRedeems, tx])

  const redeemRetryable = useCallback(
    (userTxnHash: string) => {
      if (!bridge) return
      return bridge.l2Bridge.arbRetryableTx.redeem(userTxnHash)
    },
    [bridge]
  )

  const { confirmPeriodBlocks = 45818 } = l2NetworkDetails as Network
  const { blockTime = 15 } = l1NetworkDetails as Network

  const handleTriggerOutbox = async () => {
    if (tx.uniqueId === null) {
      return
    }
    let res
    if (tx.asset === 'eth') {
      res = await arbTokenBridge.eth.triggerOutbox(tx.uniqueId.toString())
    } else {
      res = await arbTokenBridge.token.triggerOutbox(tx.uniqueId.toString())
    }
    if (!res) {
      alert("Can't claim this withdrawal yet; try again later")
    }
  }

  const calcEtaDisplay = () => {
    const blocksRemaining = Math.max(
      confirmPeriodBlocks - (currentL1BlockNumber - tx.blockNum!),
      0
    )

    const minutesLeft = Math.round((blocksRemaining * blockTime) / 60)
    const hoursLeft = Math.round(minutesLeft / 60)
    const daysLeft = Math.round(hoursLeft / 24)

    if (daysLeft > 0) {
      return `~${blocksRemaining} blocks (~${daysLeft} day${
        daysLeft === 1 ? '' : 's'
      })`
    }

    if (hoursLeft > 0) {
      return `~${blocksRemaining} blocks (~${hoursLeft} hour${
        hoursLeft === 1 ? '' : 's'
      })`
    }

    if (minutesLeft === 0) {
      return 'about 1 hour'
    }

    return `~${blocksRemaining} blocks (~${minutesLeft} minute${
      minutesLeft === 1 ? '' : 's'
    })`
  }

  return (
    <tr>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-dark-blue">
        {tx.direction === 'outbox'
          ? 'withdrawal-redeem-on-l1'
          : tx.direction === 'withdraw'
          ? 'withdrawal-initiated'
          : tx.direction}
      </td>
      <td className="px-4 py-6  whitespace-nowrap text-sm ">
        <StatusBadge
          variant={
            tx.status === 'success'
              ? 'green'
              : tx.status === 'failure'
              ? 'red'
              : tx.status === 'pending'
              ? 'blue'
              : 'yellow'
          }
        >
          {tx.status}
        </StatusBadge>
      </td>
      <td className="px-2 py-6 whitespace-nowrap leading-5 font-normal text-gray-500">
        {tx.isWithdrawal && tx.status === 'Confirmed' && (
          <div className="relative group">
            <Button
              size="sm"
              disabled={networkDetails?.isArbitrum}
              onClick={handleTriggerOutbox}
            >
              Claim
            </Button>
            {networkDetails?.isArbitrum && (
              <Tooltip>Must be on l1 network to claim withdrawal.</Tooltip>
            )}
          </div>
        )}

        {tx.isWithdrawal && tx.status === 'Unconfirmed' && (
          <div className="relative group">
            <Button variant="white" size="sm">
              Claim
            </Button>
            <Tooltip>
              Transaction must be confirmed: ETA: {calcEtaDisplay()}
            </Tooltip>
          </div>
        )}

        {tx.isWithdrawal && tx.status === 'Executed' && 'Already claimed'}

        {showRedeemRetryableButton && (
          <div className="relative group">
            <Button
              size="sm"
              disabled={isDepositMode}
              onClick={() => redeemRetryable(tx.txId)}
            >
              Re-execute
            </Button>
            {isDepositMode && (
              <Tooltip>
                Must be on l2 network to execute your l2 deposit.
              </Tooltip>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-gray-500">
        {!tx.isWithdrawal && (
          <>
            {tx.createdAt && tx.status === 'pending' ? (
              <PendingCountdown tx={tx} />
            ) : (
              <span>{tx.resolvedAt ?? tx.createdAt ?? 'N/A'}</span>
            )}
          </>
        )}
        {tx.isWithdrawal && tx.status === 'Unconfirmed' && (
          <>
            <span>Unconfirmed: ETA: {calcEtaDisplay()}</span>
          </>
        )}
      </td>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-dark-blue">
        {tx.uniqueId ? (
          tx.uniqueId.toString()
        ) : (
          <ExplorerLink hash={tx.txId} type={tx.direction as TxnType} />
        )}
      </td>
      <td className="px-4 py-6 whitespace-nowrap text-xs leading-4 font-medium text-navy">
        <span className="bg-tokenPill rounded-lg py-1 px-3">{tx.asset}</span>
      </td>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-gray-500">
        {tx.value}
      </td>
    </tr>
  )
}

const TransactionsTable = ({
  transactions,
  overflowX = true
}: TransactionsTableProps): JSX.Element => {
  return (
    <div>
      <div className="flex flex-col shadow-sm">
        <div className={`-my-2 ${overflowX ? 'overflow-x-auto' : ''}`}>
          <div className="py-2 align-middle inline-block min-w-full ">
            <div className="overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Action
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Redeem
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Estimated Arrival Time
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Txid
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Asset
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map(tx => (
                    <TableRow tx={tx} key={tx.txId} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { TransactionsTable }
