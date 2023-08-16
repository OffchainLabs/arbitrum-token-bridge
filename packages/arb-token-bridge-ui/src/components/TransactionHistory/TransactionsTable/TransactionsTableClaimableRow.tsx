import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { twMerge } from 'tailwind-merge'

import { NodeBlockDeadlineStatusTypes } from '../../../hooks/arbTokenBridge.types'
import { MergedTransaction } from '../../../state/app/state'
import { StatusBadge } from '../../common/StatusBadge'
import { TransactionsTableCustomAddressLabel } from './TransactionsTableCustomAddressLabel'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { WithdrawalCountdown } from '../../common/WithdrawalCountdown'
import { ExternalLink } from '../../common/ExternalLink'
import { shortenTxHash } from '../../../util/CommonUtils'
import { Tooltip } from '../../common/Tooltip'
import {
  ChainId,
  getExplorerUrl,
  getNetworkName,
  isNetwork
} from '../../../util/networks'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import {
  isCustomDestinationAddressTx,
  findMatchingL1TxForWithdrawal,
  isPending
} from '../../../state/app/utils'
import { TransactionDateTime } from './TransactionsTable'
import { formatAmount } from '../../../util/NumberUtils'
import { sanitizeTokenSymbol } from '../../../util/TokenUtils'
import { TransactionsTableRowAction } from './TransactionsTableRowAction'

type CommonProps = {
  tx: MergedTransaction
  isSourceChainArbitrum: boolean
}

function ClaimableRowStatus({ tx, isSourceChainArbitrum }: CommonProps) {
  const matchingL1Tx = tx.isCctp
    ? tx.cctpData?.receiveMessageTransactionHash
    : findMatchingL1TxForWithdrawal(tx)
  const fromNetwork = isSourceChainArbitrum ? 'L2' : 'L1'
  const toNetwork = isSourceChainArbitrum ? 'L1' : 'L2'

  switch (tx.status) {
    case 'pending':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="yellow"
            aria-label={`${fromNetwork} Transaction Status`}
          >
            Pending
          </StatusBadge>
        </div>
      )
    case 'Unconfirmed':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="green"
            aria-label={`${fromNetwork} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge
            variant="yellow"
            aria-label={`${toNetwork} Transaction Status`}
          >
            Pending
          </StatusBadge>
        </div>
      )

    case 'Confirmed':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="green"
            aria-label={`${fromNetwork} Transaction Status`}
          >
            Success
          </StatusBadge>
          <Tooltip
            content={<span>Funds are ready to be claimed on {toNetwork}</span>}
          >
            <StatusBadge
              variant="yellow"
              aria-label={`${toNetwork} Transaction Status`}
            >
              <InformationCircleIcon className="h-4 w-4" /> Confirmed
            </StatusBadge>
          </Tooltip>
        </div>
      )

    case 'Executed': {
      if (typeof matchingL1Tx === 'undefined') {
        return (
          <div className="flex flex-col space-y-1">
            <StatusBadge
              variant="green"
              aria-label={`${fromNetwork} Transaction Status`}
            >
              Success
            </StatusBadge>
            <Tooltip
              content={
                <span>
                  Executed: Funds have been claimed on {toNetwork}, but the
                  corresponding Tx ID was not found
                </span>
              }
            >
              <StatusBadge
                variant="gray"
                aria-label={`${toNetwork} Transaction Status`}
              >
                <InformationCircleIcon className="h-4 w-4" /> n/a
              </StatusBadge>
            </Tooltip>
          </div>
        )
      }

      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="green"
            aria-label={`${fromNetwork} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge
            variant="green"
            aria-label={`${toNetwork} Transaction Status`}
          >
            Success
          </StatusBadge>
        </div>
      )
    }

    case 'Failure':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="red"
            aria-label={`${fromNetwork} Transaction Status`}
          >
            Failed
          </StatusBadge>
        </div>
      )

    default:
      return null
  }
}

function ClaimableRowTime({ tx, isSourceChainArbitrum }: CommonProps) {
  const fromNetwork = isSourceChainArbitrum ? 'L2' : 'L1'
  const toNetwork = isSourceChainArbitrum ? 'L1' : 'L2'

  if (tx.status === 'Unconfirmed') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>{fromNetwork} Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>

        {/* FIX WITHDRAWAL OR USE USEREMAININGTIME HERE */}
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
        <Tooltip content={<span>{fromNetwork} Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip content={<span>{toNetwork} Transaction Time</span>}>
            <span className="whitespace-nowrap">Ready</span>
          </Tooltip>
        )}
      </div>
    )
  }

  const claimedTx = tx.isCctp
    ? {
        createdAt: tx.cctpData?.receiveMessageTimestamp
      }
    : findMatchingL1TxForWithdrawal(tx)

  if (typeof claimedTx === 'undefined') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>{fromNetwork} Transaction time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip content={<span>Ready to claim funds on {toNetwork}</span>}>
            <span className="whitespace-nowrap">n/a</span>
          </Tooltip>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      <Tooltip content={<span>{fromNetwork} Transaction Time</span>}>
        <TransactionDateTime standardizedDate={tx.createdAt} />
      </Tooltip>
      {claimedTx?.createdAt && (
        <Tooltip content={<span>{toNetwork} Transaction Time</span>}>
          <span className="whitespace-nowrap">
            <TransactionDateTime standardizedDate={claimedTx?.createdAt} />
          </span>
        </Tooltip>
      )}
    </div>
  )
}

function ClaimedTxInfo({ tx, isSourceChainArbitrum }: CommonProps) {
  const { l1, l2 } = useNetworksAndSigners()
  const toNetworkId = isSourceChainArbitrum ? l1.network.id : l2.network.id

  const isExecuted = tx.status === 'Executed'
  const isBeingClaimed = tx.status === 'Confirmed' && tx.resolvedAt
  if (!isExecuted && !isBeingClaimed) {
    return null
  }

  const claimedTx = tx.isCctp
    ? {
        txId: tx.cctpData?.receiveMessageTransactionHash
      }
    : findMatchingL1TxForWithdrawal(tx)

  if (!claimedTx?.txId) {
    return (
      <span className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark">
        <span className="rounded-md px-2 text-xs text-dark">Step 2</span>
        {getNetworkName(toNetworkId)}: Not available
      </span>
    )
  }

  return (
    <span
      className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
      aria-label={`${isSourceChainArbitrum ? 'L1' : 'L2'} Transaction Link`}
    >
      <span className="rounded-md px-2 text-xs text-dark">Step 2</span>
      {getNetworkName(toNetworkId)}:{' '}
      <ExternalLink
        href={`${getExplorerUrl(toNetworkId)}/tx/${claimedTx.txId}`}
        className="arb-hover text-blue-link"
      >
        {shortenTxHash(claimedTx.txId)}
      </ExternalLink>
    </span>
  )
}

function ClaimableRowTxID({ tx, isSourceChainArbitrum }: CommonProps) {
  const { l1, l2 } = useNetworksAndSigners()
  const fromNetworkId = isSourceChainArbitrum ? l2.network.id : l1.network.id

  return (
    <div className="flex flex-col space-y-3">
      <span
        className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
        aria-label={`${isSourceChainArbitrum ? 'L2' : 'L1'} Transaction Link`}
      >
        <span className="rounded-md px-2 text-xs text-dark">Step 1</span>
        {getNetworkName(fromNetworkId)}:{' '}
        <ExternalLink
          href={`${getExplorerUrl(fromNetworkId)}/tx/${tx.txId}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(tx.txId)}
        </ExternalLink>
      </span>

      <ClaimedTxInfo tx={tx} isSourceChainArbitrum={isSourceChainArbitrum} />
    </div>
  )
}

// This component either render Cctp row (deposit/withdrawal) or standard withdrawal
export function TransactionsTableClaimableRow({
  tx,
  className = ''
}: {
  tx: MergedTransaction
  className?: string
}) {
  const isError = tx.status === 'Failure'
  const { l1, l2 } = useNetworksAndSigners()
  const sourceChainId = tx.cctpData?.sourceChainId ?? ChainId.ArbitrumOne // TODO: check if other L2
  const {
    isEthereum: isSourceChainIdEthereum,
    isArbitrum: isSourceChainIdArbitrum
  } = isNetwork(sourceChainId)
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
        chain: isSourceChainIdEthereum ? l1.network : l2.network
      }),
    [tx.asset, tx.tokenAddress, isSourceChainIdEthereum, l1.network, l2.network]
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
        <ClaimableRowStatus
          tx={tx}
          isSourceChainArbitrum={isSourceChainIdArbitrum}
        />
      </td>

      <td className={twMerge('w-1/5 px-3 py-3', customAddressTxPadding)}>
        <ClaimableRowTime
          tx={tx}
          isSourceChainArbitrum={isSourceChainIdArbitrum}
        />
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
        <ClaimableRowTxID
          tx={tx}
          isSourceChainArbitrum={isSourceChainIdArbitrum}
        />
      </td>

      <td
        className={twMerge(
          'relative w-1/5 py-3 pl-3 pr-6 text-right',
          customAddressTxPadding
        )}
      >
        <TransactionsTableRowAction
          tx={tx}
          isError={isError}
          type={tx.isWithdrawal ? 'withdrawals' : 'deposits'}
        />
      </td>
      {isCustomDestinationAddressTx(tx) && (
        <td>
          <TransactionsTableCustomAddressLabel tx={tx} />
        </td>
      )}
    </tr>
  )
}
