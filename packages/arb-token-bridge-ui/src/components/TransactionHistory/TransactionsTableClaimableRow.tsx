import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { twMerge } from 'tailwind-merge'

import { MergedTransaction } from '../../state/app/state'
import { StatusBadge } from '../common/StatusBadge'
import { TransactionsTableCustomAddressLabel } from './TransactionsTableCustomAddressLabel'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import { ExternalLink } from '../common/ExternalLink'
import { shortenTxHash } from '../../util/CommonUtils'
import { Tooltip } from '../common/Tooltip'
import {
  ChainId,
  getExplorerUrl,
  getNetworkName,
  isNetwork
} from '../../util/networks'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { isCustomDestinationAddressTx, isPending } from '../../state/app/utils'
import { TransactionDateTime } from './TransactionHistoryTable'
import { formatAmount } from '../../util/NumberUtils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { TransactionsTableRowAction } from './TransactionsTableRowAction'
import { useRemainingTime } from '../../state/cctpState'
import { useChainLayers } from '../../hooks/useChainLayers'
import { NetworkImage } from '../common/NetworkImage'
import { getWithdrawalClaimParentChainTxDetails } from './helpers'

type CommonProps = {
  tx: MergedTransaction
  isSourceChainArbitrum?: boolean
}

function ClaimableRowStatus({ tx }: CommonProps) {
  const { parentLayer, layer: childLayer } = useChainLayers()
  const matchingL1TxId = tx.isCctp
    ? tx.cctpData?.receiveMessageTransactionHash
    : getWithdrawalClaimParentChainTxDetails(tx)?.txId

  const sourceLayer = tx.isWithdrawal ? childLayer : parentLayer
  const destLayer = tx.isWithdrawal ? parentLayer : childLayer

  switch (tx.status) {
    case 'pending':
      return (
        <div className="flex flex-col space-y-1">
          <div className="flex flex-col space-y-1">
            <StatusBadge
              variant="yellow"
              aria-label={`${sourceLayer} Transaction Status`}
            >
              Pending
            </StatusBadge>
          </div>
          <div className="flex flex-col space-y-1">
            <StatusBadge
              variant="yellow"
              aria-label={`${destLayer} Transaction Status`}
            >
              Pending
            </StatusBadge>
          </div>
        </div>
      )
    case 'Unconfirmed':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="green"
            aria-label={`${sourceLayer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge
            variant="yellow"
            aria-label={`${destLayer} Transaction Status`}
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
            aria-label={`${sourceLayer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <Tooltip
            content={<span>Funds are ready to be claimed on {destLayer}</span>}
          >
            <StatusBadge
              variant="yellow"
              aria-label={`${destLayer} Transaction Status`}
            >
              <InformationCircleIcon className="h-4 w-4" /> Confirmed
            </StatusBadge>
          </Tooltip>
        </div>
      )

    case 'Executed': {
      if (typeof matchingL1TxId === 'undefined') {
        return (
          <div className="flex flex-col space-y-1">
            <StatusBadge
              variant="green"
              aria-label={`${sourceLayer} Transaction Status`}
            >
              Success
            </StatusBadge>
            <Tooltip
              content={
                <span>
                  Executed: Funds have been claimed on {destLayer}, but the
                  corresponding Tx ID was not found
                </span>
              }
            >
              <StatusBadge
                variant="gray"
                aria-label={`${destLayer} Transaction Status`}
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
            aria-label={`${sourceLayer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge
            variant="green"
            aria-label={`${destLayer} Transaction Status`}
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
            aria-label={`${sourceLayer} Transaction Status`}
          >
            Failed
          </StatusBadge>
        </div>
      )

    default:
      return null
  }
}

function ClaimableRowTime({ tx }: CommonProps) {
  const { parentLayer, layer } = useChainLayers()
  const sourceLayer = tx.isWithdrawal ? layer : parentLayer
  const destinationLayer = tx.isWithdrawal ? parentLayer : layer
  const { remainingTime } = useRemainingTime(tx)

  if (tx.status === 'pending') {
    return tx.isCctp ? <>{remainingTime}</> : <WithdrawalCountdown tx={tx} />
  }

  if (tx.status === 'Unconfirmed') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>{sourceLayer} Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>

        {tx.isCctp ? <>{remainingTime}</> : <WithdrawalCountdown tx={tx} />}
      </div>
    )
  }

  if (tx.status === 'Confirmed') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>{sourceLayer} Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip content={<span>{destinationLayer} Transaction Time</span>}>
            <span className="whitespace-nowrap">Ready</span>
          </Tooltip>
        )}
      </div>
    )
  }

  const claimedTxTimestamp = tx.isCctp
    ? tx.cctpData?.receiveMessageTimestamp
    : getWithdrawalClaimParentChainTxDetails(tx)?.timestamp

  if (typeof claimedTxTimestamp === 'undefined') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>{sourceLayer} Transaction time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip
            content={<span>Ready to claim funds on {destinationLayer}</span>}
          >
            <span className="whitespace-nowrap">n/a</span>
          </Tooltip>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      <Tooltip content={<span>{sourceLayer} Transaction Time</span>}>
        <TransactionDateTime standardizedDate={tx.createdAt} />
      </Tooltip>
      {claimedTxTimestamp && (
        <Tooltip content={<span>{parentLayer} Transaction Time</span>}>
          <span className="whitespace-nowrap">
            <TransactionDateTime standardizedDate={claimedTxTimestamp} />
          </span>
        </Tooltip>
      )}
    </div>
  )
}

function ClaimedTxInfo({ tx, isSourceChainArbitrum }: CommonProps) {
  const { parentLayer } = useChainLayers()
  const toNetworkId = isSourceChainArbitrum ? tx.parentChainId : tx.childChainId

  const isExecuted = tx.status === 'Executed'
  const isBeingClaimed = tx.status === 'Confirmed' && tx.resolvedAt

  const claimedTxId = tx.isCctp
    ? tx.cctpData?.receiveMessageTransactionHash
    : getWithdrawalClaimParentChainTxDetails(tx)?.txId

  if (!claimedTxId) {
    return (
      <span className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark">
        <span className="w-8 rounded-md pr-2 text-xs text-dark">To</span>
        <NetworkImage chainId={toNetworkId} />
        <span className="pl-1">{getNetworkName(toNetworkId)}: </span>
        {!isExecuted && !isBeingClaimed ? 'Pending' : 'Not available'}
      </span>
    )
  }

  return (
    <span
      className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
      aria-label={`${parentLayer} Transaction Link`}
    >
      <span className="w-8 rounded-md pr-2 text-xs text-dark">To</span>
      <NetworkImage chainId={toNetworkId} />
      {getNetworkName(toNetworkId)}:{' '}
      <ExternalLink
        href={`${getExplorerUrl(toNetworkId)}/tx/${claimedTxId}`}
        className="arb-hover text-blue-link"
      >
        {shortenTxHash(claimedTxId)}
      </ExternalLink>
    </span>
  )
}

function ClaimableRowTxID({ tx, isSourceChainArbitrum }: CommonProps) {
  const { layer } = useChainLayers()
  const fromNetworkId = isSourceChainArbitrum
    ? tx.childChainId
    : tx.parentChainId

  return (
    <div className="flex flex-col space-y-3">
      <span
        className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
        aria-label={`${layer} Transaction Link`}
      >
        <span className="w-8 rounded-md pr-2 text-xs text-dark">From</span>
        <NetworkImage chainId={fromNetworkId} />
        <span className="pl-1">{getNetworkName(fromNetworkId)}: </span>
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
  const sourceChainId = tx.cctpData?.sourceChainId ?? ChainId.ArbitrumOne
  const {
    isEthereumMainnetOrTestnet: isSourceChainIdEthereum,
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
        chainId: isSourceChainIdEthereum ? tx.parentChainId : tx.childChainId
      }),
    [
      tx.asset,
      tx.tokenAddress,
      tx.parentChainId,
      tx.childChainId,
      isSourceChainIdEthereum
    ]
  )

  const customAddressTxPadding = useMemo(
    () => (isCustomDestinationAddressTx(tx) ? 'pb-11' : ''),
    [tx]
  )

  if (!tx.sender || !address) {
    return null
  }

  return (
    <div
      data-testid={`withdrawal-row-${tx.txId}`}
      className={twMerge(
        'relative grid h-full grid-cols-[150px_250px_140px_290px_140px] border-b border-dark text-sm text-dark',
        className,
        bgClassName
      )}
    >
      <div
        className={twMerge(
          'py-4 pl-6 pr-3 align-middle',
          customAddressTxPadding
        )}
      >
        <ClaimableRowStatus
          tx={tx}
          isSourceChainArbitrum={isSourceChainIdArbitrum}
        />
      </div>

      <div
        className={twMerge(
          'flex items-center px-3 py-5 align-middle',
          customAddressTxPadding
        )}
      >
        <ClaimableRowTime
          tx={tx}
          isSourceChainArbitrum={isSourceChainIdArbitrum}
        />
      </div>

      <div
        className={twMerge(
          'flex items-center whitespace-nowrap px-3 py-5 align-middle',
          customAddressTxPadding
        )}
      >
        <span>
          {formatAmount(Number(tx.value), {
            symbol: tokenSymbol
          })}
        </span>
      </div>

      <div
        className={twMerge('px-3 py-5 align-middle', customAddressTxPadding)}
      >
        <ClaimableRowTxID
          tx={tx}
          isSourceChainArbitrum={isSourceChainIdArbitrum}
        />
      </div>

      <div
        className={twMerge(
          'relative py-5 pl-3 pr-6 text-right align-middle',
          customAddressTxPadding
        )}
      >
        <TransactionsTableRowAction
          tx={tx}
          isError={isError}
          type={tx.isWithdrawal ? 'withdrawals' : 'deposits'}
        />
      </div>
      {isCustomDestinationAddressTx(tx) && (
        <div>
          <TransactionsTableCustomAddressLabel tx={tx} />
        </div>
      )}
    </div>
  )
}
