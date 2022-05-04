import { useState, useMemo, useCallback } from 'react'
import { BigNumber } from 'ethers'
import dayjs from 'dayjs'
import Countdown from 'react-countdown'
import { useAppState } from 'src/state'
import { DepositStatus } from '../../state/app/state'
import { TxnType } from 'token-bridge-sdk'
import { L1ToL2MessageWriter, L1ToL2MessageStatus } from '@arbitrum/sdk'
import Loader from 'react-loader-spinner'

import { MergedTransaction } from '../../state/app/state'
import { Button } from '../common/Button'
import ExplorerLink from '../common/ExplorerLink'
import { StatusBadge } from '../common/StatusBadge'
import { Tooltip } from '../common/Tooltip'

import { useAppContext } from '../App/AppContext'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

interface TransactionsTableProps {
  transactions: MergedTransaction[]
  overflowX?: boolean
}

const depositStatusDisplayText = (depositStatus: DepositStatus) => {
  switch (depositStatus) {
    case DepositStatus.L1_PENDING:
      return 'waiting on l1...'
    case DepositStatus.L1_FAILURE:
      return 'l1 tx failed'
    case DepositStatus.L2_PENDING:
      return 'l1 confirmed, waiting on l2...'
    case DepositStatus.L2_SUCCESS:
      return 'success'
    case DepositStatus.L2_FAILURE:
      return 'l2 txn failed; try re-executing'
    case DepositStatus.CREATION_FAILED:
      return 'l2 failed; contact support'
    case DepositStatus.EXPIRED:
      return 'l2 tx expired'
  }
}

const isDeposit = (tx: MergedTransaction) => {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

const PendingCountdown = ({ tx }: { tx: MergedTransaction }): JSX.Element => {
  const now = dayjs()
  const whenCreated = dayjs(tx?.createdAt)
  const diffInSeconds = now.diff(whenCreated, 'seconds')
  return (
    <Countdown
      date={now
        .add(
          tx.depositStatus === DepositStatus.L2_PENDING
            ? Math.max(10 * 60 - diffInSeconds + 2, 0)
            : Math.max(3 * 60 - diffInSeconds + 2, 0),
          'seconds'
        )
        .toDate()}
      renderer={({ hours, minutes, seconds /* , completed */ }) => {
        // if (completed) {
        //   // Render a completed state
        //   return <>Done</>
        // }
        // Render a countdown
        if (tx.direction === 'deposit-l1') {
          const paddedSeconds = `0${seconds}`.slice(-2)

          return (
            <span className="text-bright-blue">
              {minutes}:{paddedSeconds} Seconds
            </span>
          )
        }

        const paddedMinutes = `0${minutes}`.slice(-2)
        return (
          <span className="text-bright-blue">
            {hours}:{paddedMinutes} Mins
          </span>
        )
      }}
    />
  )
}

const TableRow = ({ tx }: { tx: MergedTransaction }): JSX.Element => {
  const {
    app: { arbTokenBridge, isDepositMode }
  } = useAppState()
  const {
    l1: { network: l1Network },
    l2: { network: l2Network, signer: l2Signer },
    isConnectedToArbitrum
  } = useNetworksAndSigners()
  const { currentL1BlockNumber } = useAppContext()

  const [isClaiming, setIsClaiming] = useState(false)

  const showRedeemRetryableButton = useMemo(() => {
    if (tx.depositStatus === DepositStatus.L2_FAILURE) {
      return true
    }

    return false
  }, [tx])

  const redeemRetryable = useCallback(
    async (tx: MergedTransaction) => {
      if (typeof l2Signer === 'undefined') {
        return
      }

      const retryableCreationTxID = tx.l1ToL2MsgData?.retryableCreationTxID

      if (!retryableCreationTxID)
        throw new Error("Can't redeem; txid not found")

      const l1ToL2Msg = L1ToL2MessageWriter.fromRetryableCreationId(
        l2Signer,
        retryableCreationTxID,
        BigNumber.from(tx.seqNum)
      )
      const res = await l1ToL2Msg.redeem()
      await res.wait()

      // update in store
      arbTokenBridge.transactions.fetchAndUpdateL1ToL2MsgStatus(
        tx.txId,
        l1ToL2Msg,
        tx.asset === 'eth',
        L1ToL2MessageStatus.REDEEMED
      )
    },
    [arbTokenBridge, l2Signer]
  )

  const blockTime = l1Network?.blockTime || 15

  const handleTriggerOutbox = async () => {
    if (tx.uniqueId === null) {
      return
    }

    let res, err

    setIsClaiming(true)

    try {
      if (tx.asset === 'eth') {
        res = await arbTokenBridge.eth.triggerOutbox(tx.uniqueId.toString())
      } else {
        res = await arbTokenBridge.token.triggerOutbox(tx.uniqueId.toString())
      }
    } catch (error: any) {
      err = error
      console.warn(err)
    } finally {
      setIsClaiming(false)
    }

    // Don't show any alert in case user denies the signature
    if (err?.code === 4001) {
      return
    }

    if (!res) {
      // eslint-disable-next-line no-alert
      alert("Can't claim this withdrawal yet; try again later")
    }
  }

  const calcEtaDisplay = () => {
    const { nodeBlockDeadline } = tx

    if (
      typeof nodeBlockDeadline === 'undefined' ||
      typeof l2Network === 'undefined'
    ) {
      return 'calculating...'
    }

    if (nodeBlockDeadline === 'NODE_NOT_CREATED') {
      return l2Network.chainID === 42161 ? '~ 1 week' : '~1 day'
    }

    // Buffer for after a node is confirmable but isn't yet confirmed; we give ~30 minutes, should be usually/always be less in practice
    const confirmationBufferBlocks = 120
    const blocksRemaining = Math.max(
      nodeBlockDeadline + confirmationBufferBlocks - currentL1BlockNumber,
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

  const actionDisplayText = (txnType: TxnType) => {
    switch (tx.direction) {
      case 'outbox':
        return 'withdrawal-redeem-on-l1'
      case 'withdraw':
        return 'withdrawal-initiated'
      case 'deposit':
      case 'deposit-l1':
        return 'deposit'

      default:
        return txnType
    }
  }

  const statusDisplayText = (tx: MergedTransaction) => {
    if (tx.depositStatus) {
      return depositStatusDisplayText(tx.depositStatus)
    } else {
      return tx.status
    }
  }

  const getStatusVariantColor = (tx: MergedTransaction) => {
    if (tx.depositStatus) {
      const { depositStatus } = tx

      switch (depositStatus) {
        case DepositStatus.L1_PENDING:
        case DepositStatus.L2_PENDING:
          return 'blue'
        case DepositStatus.L1_FAILURE:
        case DepositStatus.CREATION_FAILED:
        case DepositStatus.EXPIRED:
          return 'red'
        case DepositStatus.L2_SUCCESS:
          return 'green'
        case DepositStatus.L2_FAILURE:
          return 'yellow'
      }
    } else {
      switch (tx.status) {
        case 'success':
          return 'green'
        case 'failure':
          return 'red'
        case 'pending':
          return 'blue'
        default:
          return 'yellow'
      }
    }
  }

  const renderTxIDDisplay = (tx: MergedTransaction) => {
    if (tx.uniqueId) return tx.uniqueId.toString()
    if (isDeposit(tx)) {
      const targetL2Tx = tx.l1ToL2MsgData?.l2TxID
      return (
        <>
          L1: <ExplorerLink hash={tx.txId} type={tx.direction as TxnType} />{' '}
          <br />
          {targetL2Tx ? (
            <>
              L2: <ExplorerLink hash={targetL2Tx} type={'deposit-l2'} />{' '}
            </>
          ) : null}
        </>
      )
    } else {
      return <ExplorerLink hash={tx.txId} type={tx.direction as TxnType} />
    }
  }

  return (
    <tr>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-dark-blue">
        {actionDisplayText(tx.direction)}
      </td>
      <td className="px-4 py-6  whitespace-nowrap text-sm ">
        <StatusBadge variant={getStatusVariantColor(tx)}>
          {statusDisplayText(tx)}
        </StatusBadge>
      </td>
      <td className="px-2 py-6 whitespace-nowrap leading-5 font-normal text-gray-500">
        {tx.isWithdrawal && tx.status === 'Confirmed' && (
          <div className="relative group">
            {isClaiming ? (
              <div className="flex justify-center py-1">
                <Loader type="Oval" color="#28A0F0" height={24} width={24} />
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  disabled={isConnectedToArbitrum}
                  onClick={handleTriggerOutbox}
                >
                  Claim
                </Button>
                {isConnectedToArbitrum && (
                  <Tooltip>Must be on l1 network to claim withdrawal.</Tooltip>
                )}
              </>
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
              disabled={!isConnectedToArbitrum}
              onClick={() => redeemRetryable(tx)}
            >
              Re-execute
            </Button>
            {isDepositMode && (
              <Tooltip>
                Must connect your wallet to l2 network to re-execute your l2
                deposit.
              </Tooltip>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-gray-500">
        {!tx.isWithdrawal && (
          <>
            {(tx.createdAt && tx.status === 'pending') ||
            tx.depositStatus === DepositStatus.L2_PENDING ? (
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
        {renderTxIDDisplay(tx)}
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
