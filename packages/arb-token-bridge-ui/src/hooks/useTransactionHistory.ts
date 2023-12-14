import useSWRImmutable from 'swr/immutable'
import useSWRInfinite from 'swr/infinite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import { ChainId, rpcURLs } from '../util/networks'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { getWagmiChain } from '../util/wagmi/getWagmiChain'
import { fetchWithdrawals } from '../util/withdrawals/fetchWithdrawals'
import { fetchDeposits } from '../util/deposits/fetchDeposits'
import {
  L2ToL1EventResultPlus,
  WithdrawalInitiated
} from './arbTokenBridge.types'
import { Transaction } from './useTransactions'
import { MergedTransaction } from '../state/app/state'
import {
  getStandardizedTimestamp,
  transformDeposit,
  transformWithdrawal
} from '../state/app/utils'
import {
  EthWithdrawal,
  isTokenWithdrawal,
  mapETHWithdrawalToL2ToL1EventResult,
  mapTokenWithdrawalFromEventLogsToL2ToL1EventResult,
  mapWithdrawalToL2ToL1EventResult
} from '../util/withdrawals/helpers'
import { FetchWithdrawalsFromSubgraphResult } from '../util/withdrawals/fetchWithdrawalsFromSubgraph'
import { updateAdditionalDepositData } from '../util/deposits/helpers'
import { useCctpFetching } from '../state/cctpState'
import { isTxPending } from '../components/TransactionHistory/helpers'

export type TransactionHistoryParams = {
  data: {
    transactions: MergedTransaction[]
    numberOfDays: number
  }
  loading: boolean
  completed: boolean
  error: unknown
  pause: () => void
  resume: () => void
  addPendingTransaction: (tx: MergedTransaction) => void
}

export type Deposit = Transaction

export type Withdrawal =
  | FetchWithdrawalsFromSubgraphResult
  | WithdrawalInitiated
  | EthWithdrawal

type DepositOrWithdrawal = Deposit | Withdrawal
type Transfer = DepositOrWithdrawal | MergedTransaction

function getStandardizedTimestampByTx(tx: Transfer) {
  if (isCctpTransfer(tx)) {
    return (tx.createdAt ?? 0) / 1_000
  }

  if (isDeposit(tx)) {
    return tx.timestampCreated ?? 0
  }

  if (isWithdrawalFromSubgraph(tx)) {
    return getStandardizedTimestamp(tx.l2BlockTimestamp)
  }

  return getStandardizedTimestamp(tx.timestamp ?? '0')
}

function sortByTimestampDescending(a: Transfer, b: Transfer) {
  return getStandardizedTimestampByTx(a) > getStandardizedTimestampByTx(b)
    ? -1
    : 1
}

const multiChainFetchList: { parentChain: ChainId; chain: ChainId }[] = [
  {
    parentChain: ChainId.Ethereum,
    chain: ChainId.ArbitrumOne
  },
  {
    parentChain: ChainId.Ethereum,
    chain: ChainId.ArbitrumNova
  },
  // Testnet
  {
    parentChain: ChainId.Goerli,
    chain: ChainId.ArbitrumGoerli
  },
  {
    parentChain: ChainId.Sepolia,
    chain: ChainId.ArbitrumSepolia
  },
  // Orbit
  {
    parentChain: ChainId.ArbitrumGoerli,
    chain: ChainId.XaiTestnet
  },
  {
    parentChain: ChainId.ArbitrumSepolia,
    chain: ChainId.StylusTestnet
  }
]

function isWithdrawalFromSubgraph(
  tx: Withdrawal
): tx is FetchWithdrawalsFromSubgraphResult {
  return tx.source === 'subgraph'
}

function isDeposit(tx: DepositOrWithdrawal): tx is Deposit {
  return tx.direction === 'deposit'
}

export function isCctpTransfer(tx: Transfer): tx is MergedTransaction {
  return !!(tx as MergedTransaction).isCctp
}

async function transformTransaction(tx: Transfer): Promise<MergedTransaction> {
  const parentChainProvider = getProvider(tx.parentChainId)
  const childChainProvider = getProvider(tx.childChainId)

  if (isCctpTransfer(tx)) {
    return tx
  }

  if (isDeposit(tx)) {
    return transformDeposit(
      await updateAdditionalDepositData({
        depositTx: tx,
        l1Provider: parentChainProvider,
        l2Provider: childChainProvider
      })
    )
  }

  let withdrawal: L2ToL1EventResultPlus | undefined

  if (isWithdrawalFromSubgraph(tx)) {
    withdrawal = await mapWithdrawalToL2ToL1EventResult({
      withdrawal: tx,
      l1Provider: parentChainProvider,
      l2Provider: childChainProvider
    })
  } else {
    if (isTokenWithdrawal(tx)) {
      withdrawal = await mapTokenWithdrawalFromEventLogsToL2ToL1EventResult({
        result: tx,
        l1Provider: parentChainProvider,
        l2Provider: childChainProvider
      })
    } else {
      withdrawal = await mapETHWithdrawalToL2ToL1EventResult({
        event: tx,
        l1Provider: parentChainProvider,
        l2Provider: childChainProvider
      })
    }
  }

  if (withdrawal) {
    return transformWithdrawal(withdrawal)
  }

  // Throw user friendly error in case we catch it and display in the UI.
  throw new Error(
    'An error has occurred while fetching a transaction. Please try again later or contact the support.'
  )
}

function getProvider(chainId: ChainId) {
  const rpcUrl =
    rpcURLs[chainId] ?? getWagmiChain(chainId).rpcUrls.default.http[0]
  return new StaticJsonRpcProvider(rpcUrl)
}

/**
 * Fetches transaction history only for deposits and withdrawals, without their statuses.
 */
const useTransactionHistoryWithoutStatuses = (
  address: `0x${string}` | undefined
) => {
  const cctpTransfersMainnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Ethereum,
    l2ChainId: ChainId.ArbitrumOne,
    pageNumber: 0,
    pageSize: 1000,
    type: 'all'
  })

  const cctpTransfersTestnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Goerli,
    l2ChainId: ChainId.ArbitrumGoerli,
    pageNumber: 0,
    pageSize: 1000,
    type: 'all'
  })

  // TODO: Clean up this logic when introducing testnet/mainnet split
  const combinedCctpTransfers = [
    ...(cctpTransfersMainnet.deposits?.completed || []),
    ...(cctpTransfersMainnet.withdrawals?.completed || []),
    ...(cctpTransfersTestnet.deposits?.completed || []),
    ...(cctpTransfersTestnet.withdrawals?.completed || []),
    ...(cctpTransfersMainnet.deposits?.pending || []),
    ...(cctpTransfersMainnet.withdrawals?.pending || []),
    ...(cctpTransfersTestnet.deposits?.pending || []),
    ...(cctpTransfersTestnet.withdrawals?.pending || [])
  ]

  const cctpLoading =
    cctpTransfersMainnet.isLoadingDeposits ||
    cctpTransfersMainnet.isLoadingWithdrawals ||
    cctpTransfersTestnet.isLoadingDeposits ||
    cctpTransfersTestnet.isLoadingWithdrawals

  const {
    data: depositsData,
    error: depositsError,
    isLoading: depositsLoading
  } = useSWRImmutable(
    address ? ['tx_list', 'deposits', address] : null,
    ([, , _address]) => {
      return Promise.all(
        multiChainFetchList.map(chainPair => {
          return fetchDeposits({
            sender: _address,
            receiver: _address,
            l1Provider: getProvider(chainPair.parentChain),
            l2Provider: getProvider(chainPair.chain),
            pageNumber: 0,
            pageSize: 1000
          })
        })
      )
    }
  )

  const {
    data: withdrawalsData,
    error: withdrawalsError,
    isLoading: withdrawalsLoading
  } = useSWRImmutable(
    address ? ['tx_list', 'withdrawals', address] : null,
    ([, , _address]) => {
      return Promise.all(
        multiChainFetchList.map(chainPair => {
          return fetchWithdrawals({
            sender: _address,
            receiver: _address,
            l1Provider: getProvider(chainPair.parentChain),
            l2Provider: getProvider(chainPair.chain),
            pageNumber: 0,
            pageSize: 1000
          })
        })
      )
    }
  )

  const deposits = (depositsData || []).flat()
  const withdrawals = (withdrawalsData || []).flat()

  // merge deposits and withdrawals and sort them by date
  const transactions = [...deposits, ...withdrawals, ...combinedCctpTransfers]
    .flat()
    .sort(sortByTimestampDescending)

  return {
    data: transactions,
    loading: depositsLoading || withdrawalsLoading || cctpLoading,
    error: depositsError ?? withdrawalsError
  }
}

/**
 * Maps additional info to previously fetches transaction history, starting with the earliest data.
 * This is done in small batches to safely meet RPC limits.
 */
export const useTransactionHistory = (
  address: `0x${string}` | undefined
): TransactionHistoryParams => {
  // max number of transactions mapped in parallel
  const MAX_BATCH_SIZE = 10
  // Pause fetching after specified number of days. User can resume fetching to get another batch.
  const PAUSE_SIZE_DAYS = 30

  const [fetching, setFetching] = useState(true)
  const [pauseCount, setPauseCount] = useState(0)

  const { data, loading, error } = useTransactionHistoryWithoutStatuses(address)

  const getCacheKey = useCallback(
    (pageNumber: number, prevPageTxs: MergedTransaction[]) => {
      if (prevPageTxs && prevPageTxs.length === 0) {
        // no more pages
        return null
      }

      return address && !loading
        ? (['complete_tx_list', address, pageNumber] as const)
        : null
    },
    [address, loading]
  )

  const {
    data: txPages,
    error: txPagesError,
    size: page,
    setSize: setPage
  } = useSWRInfinite(
    getCacheKey,
    ([, , _page]) => {
      const startIndex = _page * MAX_BATCH_SIZE
      const endIndex = startIndex + MAX_BATCH_SIZE

      return Promise.all(
        data.slice(startIndex, endIndex).map(transformTransaction)
      )
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      revalidateFirstPage: false,
      refreshInterval: 0
    }
  )

  // transfers initiated by the user during the current session
  // we store it separately as there are a lot of side effects when mutating SWRInfinite
  const { data: newTransactionsData, mutate } = useSWRImmutable<
    MergedTransaction[]
  >(address ? ['new_tx_list', address] : null)

  const addPendingTransaction = useCallback(
    (tx: MergedTransaction) => {
      if (!isTxPending(tx)) {
        return
      }

      mutate(currentNewTransactions => {
        if (!currentNewTransactions) {
          return [tx]
        }

        return [tx, ...currentNewTransactions]
      })
    },
    [mutate]
  )

  useEffect(() => {
    if (!txPages || !fetching) {
      return
    }

    const firstPage = txPages[0]
    const lastPage = txPages[txPages.length - 1]

    if (!firstPage || !lastPage) {
      return
    }

    // if a full page is fetched, we need to fetch more
    const shouldFetchNextPage = lastPage.length === MAX_BATCH_SIZE

    if (!shouldFetchNextPage) {
      setFetching(false)
      return
    }

    const newestTx = firstPage[0]
    const oldestTx = lastPage[lastPage.length - 1]

    if (!newestTx || !oldestTx) {
      return
    }

    const oldestTxDaysAgo = dayjs().diff(dayjs(oldestTx.createdAt ?? 0), 'days')

    const nextPauseThresholdDays = (pauseCount + 1) * PAUSE_SIZE_DAYS
    const shouldPause = oldestTxDaysAgo >= nextPauseThresholdDays

    if (shouldPause) {
      pause()
      setPauseCount(prevPauseCount => prevPauseCount + 1)
      return
    }

    // make sure we don't over-fetch
    if (page === txPages.length) {
      setPage(prevPage => prevPage + 1)
    }
  }, [txPages, setPage, page, pauseCount, fetching])

  const transactions: MergedTransaction[] = [
    ...(newTransactionsData || []),
    ...(txPages || [])
  ].flat()

  const oldestTransactionDaysAgo = useMemo(() => {
    const daysAgo = dayjs().diff(
      dayjs(transactions[transactions.length - 1]?.createdAt),
      'days'
    )
    // don't show 0
    return Math.max(daysAgo, 1)
  }, [transactions])

  function pause() {
    setFetching(false)
  }

  function resume() {
    setFetching(true)
    setPage(prevPage => prevPage + 1)
  }

  if (loading || error) {
    return {
      data: { transactions: [], numberOfDays: 1 },
      loading,
      error,
      completed: true,
      pause,
      resume,
      addPendingTransaction
    }
  }

  return {
    data: {
      transactions,
      numberOfDays: oldestTransactionDaysAgo
    },
    loading: fetching,
    completed: transactions.length === data.length,
    error: txPagesError ?? error,
    pause,
    resume,
    addPendingTransaction
  }
}
