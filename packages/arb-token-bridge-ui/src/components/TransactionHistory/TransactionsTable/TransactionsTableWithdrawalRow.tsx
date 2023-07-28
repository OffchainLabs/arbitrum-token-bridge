import { useMemo } from 'react'
import { Popover } from '@headlessui/react'
import { useAccount } from 'wagmi'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'

import { NodeBlockDeadlineStatusTypes } from '../../../hooks/arbTokenBridge.types'
import { MergedTransaction } from '../../../state/app/state'
import { StatusBadge } from '../../common/StatusBadge'
import { TransactionsTableCustomAddressLabel } from './TransactionsTableCustomAddressLabel'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { useClaimWithdrawal } from '../../../hooks/useClaimWithdrawal'
import { WithdrawalCountdown } from '../../common/WithdrawalCountdown'
import { ExternalLink } from '../../common/ExternalLink'
import { shortenTxHash } from '../../../util/CommonUtils'
import { Button } from '../../common/Button'
import { Tooltip } from '../../common/Tooltip'
import { getExplorerUrl, getNetworkName } from '../../../util/networks'
import {
  EllipsisVerticalIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { shouldTrackAnalytics, trackEvent } from '../../../util/AnalyticsUtils'
import { GET_HELP_LINK } from '../../../constants'
import {
  isCustomDestinationAddressTx,
  findMatchingL1TxForWithdrawal,
  isPending
} from '../../../state/app/utils'
import { TransactionDateTime } from './TransactionsTable'
import { formatAmount } from '../../../util/NumberUtils'
import { useIsConnectedToArbitrum } from '../../../hooks/useIsConnectedToArbitrum'
import { sanitizeTokenSymbol } from '../../../util/TokenUtils'

function WithdrawalRowStatus({ tx }: { tx: MergedTransaction }) {
  const matchingL1Tx = findMatchingL1TxForWithdrawal(tx)

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
      if (typeof matchingL1Tx === 'undefined') {
        return (
          <div className="flex flex-col space-y-1">
            <StatusBadge variant="green" aria-label="L2 Transaction Status">
              Success
            </StatusBadge>
            <Tooltip
              content={
                <span>
                  Executed: Funds have been claimed on L1, but the corresponding
                  Tx ID was not found
                </span>
              }
            >
              <StatusBadge variant="gray" aria-label="L1 Transaction Status">
                <InformationCircleIcon className="h-4 w-4" /> n/a
              </StatusBadge>
            </Tooltip>
          </div>
        )
      }

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

function WithdrawalRowTime({ tx }: { tx: MergedTransaction }) {
  if (tx.status === 'Unconfirmed') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>L2 Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>

        <WithdrawalCountdown
          nodeBlockDeadline={
            tx.nodeBlockDeadline ||
            NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED
          }
        />
      </div>
    )
  }

  if (tx.status === 'Confirmed') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>L2 Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip content={<span>L1 Transaction Time</span>}>
            <span className="whitespace-nowrap">Ready</span>
          </Tooltip>
        )}
      </div>
    )
  }

  const matchingL1Tx = findMatchingL1TxForWithdrawal(tx)

  if (typeof matchingL1Tx === 'undefined') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>L2 Transaction time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip content={<span>Ready to claim funds on L1</span>}>
            <span className="whitespace-nowrap">n/a</span>
          </Tooltip>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      <Tooltip content={<span>L2 Transaction Time</span>}>
        <TransactionDateTime standardizedDate={tx.createdAt} />
      </Tooltip>
      {matchingL1Tx?.createdAt && (
        <Tooltip content={<span>L1 Transaction Time</span>}>
          <span className="whitespace-nowrap">
            <TransactionDateTime standardizedDate={matchingL1Tx?.createdAt} />
          </span>
        </Tooltip>
      )}
    </div>
  )
}

function WithdrawalRowTxID({ tx }: { tx: MergedTransaction }) {
  const { l1, l2 } = useNetworksAndSigners()

  function L1TxInfo() {
    if (tx.status !== 'Executed') {
      return null
    }

    const matchingL1Tx = findMatchingL1TxForWithdrawal(tx)

    if (typeof matchingL1Tx === 'undefined') {
      return (
        <span className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark">
          <span className="rounded-md px-2 text-xs text-dark">Step 2</span>
          {getNetworkName(l1.network.id)}: Not available
        </span>
      )
    }

    return (
      <span
        className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
        aria-label="L1 Transaction Link"
      >
        <span className="rounded-md px-2 text-xs text-dark">Step 2</span>
        {getNetworkName(l1.network.id)}:{' '}
        <ExternalLink
          href={`${getExplorerUrl(l1.network.id)}/tx/${matchingL1Tx.txId}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(matchingL1Tx.txId)}
        </ExternalLink>
      </span>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      <span
        className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
        aria-label="L2 Transaction Link"
      >
        <span className="rounded-md px-2 text-xs text-dark">Step 1</span>
        {getNetworkName(l2.network.id)}:{' '}
        <ExternalLink
          href={`${getExplorerUrl(l2.network.id)}/tx/${tx.txId}`}
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
    <Button
      variant={variant}
      onClick={onClick}
      className={variant === 'secondary' ? 'bg-white px-4 py-3' : ''}
    >
      Get Help
    </Button>
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
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const l2NetworkName = getNetworkName(l2Network.id)

  const { claim, isClaiming } = useClaimWithdrawal()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()

  const isClaimButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank')

    // track the button click
    if (shouldTrackAnalytics(l2NetworkName)) {
      trackEvent('Tx Error: Get Help Click', { network: l2NetworkName })
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
        show={isClaimButtonDisabled}
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
          disabled={isClaimButtonDisabled}
          onClick={() => claim(tx)}
        >
          Claim
        </Button>
      </Tooltip>
    )
  }

  if (isError) {
    const isTxOlderThan7Days = dayjs().diff(dayjs(tx.createdAt), 'days') > 7

    return (
      <>
        {isTxOlderThan7Days ? (
          // show a dropdown menu with the button
          <Popover>
            <Popover.Button>
              <EllipsisVerticalIcon className="h-6 w-6 cursor-pointer p-1 text-dark" />
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
  const isError = tx.status === 'Failure'
  const { l2 } = useNetworksAndSigners()
  const { address } = useAccount()

  const bgClassName = useMemo(() => {
    if (isError) return 'bg-brick'
    if (isPending(tx)) return 'bg-orange'
    return ''
  }, [tx, isError])

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chain: l2.network
      }),
    [l2.network, tx.tokenAddress, tx.asset]
  )

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
        'relative text-sm text-dark',
        bgClassName || 'bg-cyan even:bg-white',
        className
      )}
      data-testid={`withdrawal-row-${tx.txId}`}
    >
      <td className={twMerge('w-1/5 py-3 pl-6 pr-3', customAddressTxPadding)}>
        <WithdrawalRowStatus tx={tx} />
      </td>

      <td className={twMerge('w-1/5 px-3 py-3', customAddressTxPadding)}>
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
      <TransactionsTableCustomAddressLabel tx={tx} />
    </tr>
  )
}
