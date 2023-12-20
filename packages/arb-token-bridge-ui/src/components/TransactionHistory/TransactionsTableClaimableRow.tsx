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
import {
  isCustomDestinationAddressTx,
  findMatchingL1TxForWithdrawal,
  isPending
} from '../../state/app/utils'
import { TokenIcon, TransactionDateTime } from './TransactionHistoryTable'
import { formatAmount } from '../../util/NumberUtils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { TransactionsTableRowAction } from './TransactionsTableRowAction'
import { useRemainingTime } from '../../state/cctpState'
import { useChainLayers } from '../../hooks/useChainLayers'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { NetworkImage } from '../common/NetworkImage'

type CommonProps = {
  tx: MergedTransaction
  isSourceChainArbitrum?: boolean
}

function ClaimableRowStatus({ tx }: CommonProps) {
  const { parentLayer, layer } = useChainLayers()
  const matchingL1Tx = tx.isCctp
    ? tx.cctpData?.receiveMessageTransactionHash
    : findMatchingL1TxForWithdrawal(tx)

  switch (tx.status) {
    case 'pending':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="yellow"
            aria-label={`${layer} Transaction Status`}
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
            aria-label={`${layer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge
            variant="yellow"
            aria-label={`${parentLayer} Transaction Status`}
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
            aria-label={`${layer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <Tooltip
            content={
              <span>Funds are ready to be claimed on {parentLayer}</span>
            }
          >
            <StatusBadge
              variant="yellow"
              aria-label={`${parentLayer} Transaction Status`}
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
              aria-label={`${layer} Transaction Status`}
            >
              Success
            </StatusBadge>
            <Tooltip
              content={
                <span>
                  Executed: Funds have been claimed on {parentLayer}, but the
                  corresponding Tx ID was not found
                </span>
              }
            >
              <StatusBadge
                variant="gray"
                aria-label={`${parentLayer} Transaction Status`}
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
            aria-label={`${layer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge
            variant="green"
            aria-label={`${parentLayer} Transaction Status`}
          >
            Success
          </StatusBadge>
        </div>
      )
    }

    case 'Failure':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="red" aria-label={`${layer} Transaction Status`}>
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
  const { remainingTime } = useRemainingTime(tx)

  if (tx.status === 'Unconfirmed') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>{layer} Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>

        {tx.isCctp ? <>{remainingTime}</> : <WithdrawalCountdown tx={tx} />}
      </div>
    )
  }

  if (tx.status === 'Confirmed') {
    return (
      <div className="flex flex-col space-y-3">
        <Tooltip content={<span>{layer} Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip content={<span>{parentLayer} Transaction Time</span>}>
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
        <Tooltip content={<span>{layer} Transaction time</span>}>
          <TransactionDateTime standardizedDate={tx.createdAt} />
        </Tooltip>
        {tx.resolvedAt && (
          <Tooltip content={<span>Ready to claim funds on {parentLayer}</span>}>
            <span className="whitespace-nowrap">n/a</span>
          </Tooltip>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      <Tooltip content={<span>{layer} Transaction Time</span>}>
        <TransactionDateTime standardizedDate={tx.createdAt} />
      </Tooltip>
      {claimedTx?.createdAt && (
        <Tooltip content={<span>{parentLayer} Transaction Time</span>}>
          <span className="whitespace-nowrap">
            <TransactionDateTime standardizedDate={claimedTx?.createdAt} />
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

  const claimedTx = tx.isCctp
    ? {
        txId: tx.cctpData?.receiveMessageTransactionHash
      }
    : findMatchingL1TxForWithdrawal(tx)

  if (!claimedTx?.txId) {
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
        href={`${getExplorerUrl(toNetworkId)}/tx/${claimedTx.txId}`}
        className="arb-hover text-blue-link"
      >
        {shortenTxHash(claimedTx.txId)}
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
        chain: getWagmiChain(
          isSourceChainIdEthereum ? tx.parentChainId : tx.childChainId
        )
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
      className={twMerge(
        'relative h-full border-b border-dark text-sm text-dark',
        className,
        bgClassName
      )}
    >
      <tr data-testid={`withdrawal-row-${tx.txId}`}>
        <td
          className={twMerge(
            'w-[160px] py-3 pl-6 pr-3 align-middle',
            customAddressTxPadding
          )}
        >
          <ClaimableRowStatus
            tx={tx}
            isSourceChainArbitrum={isSourceChainIdArbitrum}
          />
        </td>

        <td
          className={twMerge(
            'w-[250px] px-3 py-3 align-middle',
            customAddressTxPadding
          )}
        >
          <ClaimableRowTime
            tx={tx}
            isSourceChainArbitrum={isSourceChainIdArbitrum}
          />
        </td>

        <td
          className={twMerge(
            'w-[120px] whitespace-nowrap px-3 py-3 align-middle',
            customAddressTxPadding
          )}
        >
          <div className="flex space-x-1">
            <TokenIcon tx={tx} />
            <span>
              {formatAmount(Number(tx.value), {
                symbol: tokenSymbol
              })}
            </span>
          </div>
        </td>

        <td
          className={twMerge(
            'w-[270px] px-3 py-3 align-middle',
            customAddressTxPadding
          )}
        >
          <ClaimableRowTxID
            tx={tx}
            isSourceChainArbitrum={isSourceChainIdArbitrum}
          />
        </td>

        <td
          className={twMerge(
            'relative w-[160px] py-3 pl-3 pr-6 text-right align-middle',
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
    </div>
  )
}
