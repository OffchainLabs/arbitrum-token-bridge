import { PropsWithChildren, useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import dayjs from 'dayjs'

import { MergedTransaction, WithdrawalStatus } from '../../state/app/state'
import { useTokensFromLists } from '../TransferPanel/TokenSearchUtils'
import { Button } from '../common/Button'
import {
  StatusLabel,
  getDestChainId,
  getSourceChainId,
  getTxCompletionDate,
  getTxHumanReadableRemainingTime,
  getTxRemainingTimeInMinutes,
  getTxStatusLabel,
  isTxPending
} from './helpers'
import {
  getExplorerUrl,
  getNetworkLogo,
  getNetworkName
} from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'

const TableActionCell = ({ tx }: { tx: MergedTransaction }) => {
  if (isTxPending(tx)) {
    const timeLeftInMinutes = getTxRemainingTimeInMinutes(tx)
    const timeLeft = getTxHumanReadableRemainingTime(tx)

    if (!timeLeftInMinutes) {
      return null
    }

    return (
      <div className="flex flex-col items-center justify-center text-center text-xs">
        <span>Time left:</span>
        {timeLeft}
      </div>
    )
  }

  if (tx.status === WithdrawalStatus.FAILURE) {
    return (
      <Button
        variant="primary"
        className=" bg-[#d26a6a] p-2 font-normal text-black"
      >
        Retry
      </Button>
    )
  }

  if (tx.status === WithdrawalStatus.CONFIRMED) {
    return (
      <Button
        variant="primary"
        className=" bg-[#6ad28a] p-2 font-normal text-black"
      >
        Claim
      </Button>
    )
  }

  return null
}

const TableStatusLabel = ({ tx }: { tx: MergedTransaction }) => {
  const statusLabel = getTxStatusLabel(tx)

  let colorClassName, icon

  switch (statusLabel) {
    case StatusLabel.FAILURE:
    case StatusLabel.EXPIRED:
      // TODO: add colors to config
      colorClassName = 'text-[#d26a6a]'
      break
    case StatusLabel.PENDING:
      colorClassName = 'text-[#ccb069]'
      icon = <div className="h-3 w-3 rounded-full border border-[#ccb069]" />
      break
    case StatusLabel.CLAIMABLE:
      colorClassName = 'text-[#6ad28a]'
      icon = <div className="h-3 w-3 rounded-full border border-[#6ad28a]" />
      break
    default:
      colorClassName = 'text-white'
      icon = <CheckCircleIcon className="h-4 w-4 text-white" />
  }

  return (
    <div className="flex flex-col space-y-1">
      {icon}
      <div className="flex items-center space-x-1">
        <span className={colorClassName}>{statusLabel}</span>
        <ExternalLink
          href={`${getExplorerUrl(getSourceChainId(tx))}/tx/${tx.txId}`}
        >
          <ArrowTopRightOnSquareIcon
            className={twMerge('h-3 w-3', colorClassName)}
          />
        </ExternalLink>
      </div>
    </div>
  )
}

const TableHeader = ({ children }: PropsWithChildren) => (
  <th className="h-full w-1/7 py-4 text-left text-sm font-normal">
    {children}
  </th>
)

const TableItem = ({
  children,
  className,
  containerClassName
}: PropsWithChildren<{ className?: string; containerClassName?: string }>) => (
  <td className={twMerge('w-1/7 pr-12', containerClassName)}>
    <div
      className={twMerge(
        'flex h-16 w-full flex-grow items-center space-x-3 py-3 text-left text-sm font-light',
        className
      )}
    >
      {children}
    </div>
  </td>
)

function getRelativeTime(tx: MergedTransaction) {
  return dayjs(Number(tx.createdAt)).fromNow()
}

export const TransactionHistoryTable = ({
  transactions,
  txCount,
  loading,
  type
}: {
  transactions: MergedTransaction[]
  txCount: number | undefined
  loading: boolean
  type: 'pending' | 'settled'
}) => {
  const tokensFromLists = useTokensFromLists()

  const getTokenSymbol = useCallback((tx: MergedTransaction) => {
    return sanitizeTokenSymbol(tx.asset, {
      erc20L1Address: tx.tokenAddress,
      chain: getWagmiChain(tx.parentChainId)
    })
  }, [])

  const getTokenLogoURI = useCallback(
    (tx: MergedTransaction) => {
      if (!tx.tokenAddress) {
        return 'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png'
      }

      return tokensFromLists[tx.tokenAddress]?.logoURI
    },
    [tokensFromLists]
  )

  return (
    <div className="flex max-h-full flex-col overflow-auto rounded bg-[#191919] px-4 text-white">
      <div className="flex-1 overflow-y-auto">
        <table className="min-h-[80px] w-full">
          <thead className="sticky top-0 border-b border-gray-500 bg-[#191919]">
            <TableHeader>TIME</TableHeader>
            <TableHeader>TOKEN</TableHeader>
            <TableHeader>FROM</TableHeader>
            <TableHeader>TO</TableHeader>
            <TableHeader>STATUS</TableHeader>
            <TableHeader />
            <TableHeader />
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr
                key={`${tx.parentChainId}-${tx.chainId}-${tx.txId}`}
                className="border-b border-gray-500"
              >
                <TableItem>{getRelativeTime(tx)}</TableItem>
                <TableItem>
                  {/* SafeImage is used for token logo, we don't know at buildtime where those images will be loaded from
              It would throw error if it's loaded from external domains */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getTokenLogoURI(tx) ?? ''}
                    alt="Token logo"
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="whitespace-nowrap">
                    {tx.value} {getTokenSymbol(tx)}
                  </span>
                </TableItem>
                <TableItem>
                  <Image
                    src={getNetworkLogo(getSourceChainId(tx)) ?? ''}
                    alt="Network logo"
                    width={16}
                    height={16}
                    className="mr-3"
                  />
                  {getNetworkName(getSourceChainId(tx))}
                </TableItem>
                <TableItem>
                  <Image
                    src={getNetworkLogo(getDestChainId(tx)) ?? ''}
                    alt="Network logo"
                    width={16}
                    height={16}
                    className="mr-3 rounded-full"
                  />
                  {getNetworkName(getDestChainId(tx))}
                </TableItem>
                <TableItem>
                  <TableStatusLabel tx={tx} />
                </TableItem>
                <TableItem containerClassName="pr-0" className="justify-center">
                  <TableActionCell tx={tx} />
                </TableItem>
                <TableItem containerClassName="pr-0" className="justify-end">
                  <Button
                    variant="secondary"
                    className="border border-white p-2 text-white"
                  >
                    See details
                  </Button>
                </TableItem>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 h-12 border-gray-500 bg-[#191919]">
            <tr>
              <td colSpan={12}>
                <div className="grid w-full grid-cols-3 items-center">
                  <span className="text-xs font-light">
                    {transactions.length > 0 && (
                      <>
                        Showing {transactions.length} {type} out of {txCount}{' '}
                        transactions
                      </>
                    )}
                  </span>
                  {loading && (
                    <span className="animate-pulse text-center text-xs font-light">
                      {transactions.length === 0
                        ? 'Loading...'
                        : 'Loading more...'}
                    </span>
                  )}
                  <span />
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
