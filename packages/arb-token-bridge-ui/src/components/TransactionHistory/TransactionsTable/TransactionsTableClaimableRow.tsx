import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { twMerge } from 'tailwind-merge'

import { MergedTransaction } from '../../../state/app/state'
import { StatusBadge } from '../../common/StatusBadge'
import { TransactionsTableCustomAddressLabel } from './TransactionsTableCustomAddressLabel'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { WithdrawalCountdown } from '../../common/WithdrawalCountdown'
import { Tooltip } from '../../common/Tooltip'
import { ChainId, getNetworkName, isNetwork } from '../../../util/networks'
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
import { useRemainingTime } from '../../../state/cctpState'
import { useChainLayers } from '../../../hooks/useChainLayers'
import { ExplorerTxLink } from '../../common/atoms/ExplorerLink'

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

        {tx.isCctp ? (
          <>{remainingTime}</>
        ) : (
          <WithdrawalCountdown createdAt={tx.createdAt} />
        )}
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
  const { l1, l2 } = useNetworksAndSigners()
  const { parentLayer } = useChainLayers()
  const toNetwork = isSourceChainArbitrum ? l1.network : l2.network
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
      aria-label={`${parentLayer} Transaction Link`}
    >
      <span className="rounded-md px-2 text-xs text-dark">Step 2</span>
      {getNetworkName(toNetworkId)}:{' '}
      <ExplorerTxLink
        explorerUrl={toNetwork.blockExplorers?.default.url}
        txId={claimedTx.txId}
      />
    </span>
  )
}

function ClaimableRowTxID({ tx, isSourceChainArbitrum }: CommonProps) {
  const { l1, l2 } = useNetworksAndSigners()
  const { layer } = useChainLayers()
  const fromNetwork = isSourceChainArbitrum ? l2.network : l1.network
  const fromNetworkId = isSourceChainArbitrum ? l2.network.id : l1.network.id

  return (
    <div className="flex flex-col space-y-3">
      <span
        className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
        aria-label={`${layer} Transaction Link`}
      >
        <span className="rounded-md px-2 text-xs text-dark">Step 1</span>
        {getNetworkName(fromNetworkId)}:{' '}
        <ExplorerTxLink
          explorerUrl={fromNetwork.blockExplorers?.default.url}
          txId={tx.txId}
        />
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
