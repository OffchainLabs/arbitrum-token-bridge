import { mutate, useSWRConfig, unstable_serialize } from 'swr'
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

const PAGE_SIZE = 100

export type Deposit = Transaction

export type Withdrawal =
  | FetchWithdrawalsFromSubgraphResult
  | WithdrawalInitiated
  | EthWithdrawal

type DepositOrWithdrawal = Deposit | Withdrawal
type Transfer = DepositOrWithdrawal | MergedTransaction

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
  const [deposits, setDeposits] = useState<Deposit[][]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[][]>([])

  const [depositsPage, setDepositsPage] = useState(0)
  const [withdrawalsPage, setWithdrawalsPage] = useState(0)

  const [depositsLoading, setDepositsLoading] = useState(true)
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true)

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

  const shouldFetchNextPageForChainPair = useCallback(
    (chainPairIndex: number, direction: 'deposits' | 'withdrawals') => {
      const isDeposits = direction === 'deposits'
      const page = isDeposits ? depositsPage : withdrawalsPage
      const transactions = isDeposits ? deposits : withdrawals

      if (page === 0) {
        return true
      }

      const txCountForChainPair = transactions[chainPairIndex]?.length ?? 0
      // fetch next page for a chain pair if all fetched pages are full
      // we check for >= in case some txs were included by initiating a transfer
      return txCountForChainPair / page >= PAGE_SIZE
    },
    [depositsPage, withdrawalsPage, deposits, withdrawals]
  )

  const { data: depositsData, error: depositsError } = useSWRImmutable(
    address ? ['tx_list', 'deposits', address, depositsPage] : null,
    ([, , _address, _page]) => {
      return Promise.all(
        multiChainFetchList.map((chainPair, chainPairIndex) => {
          if (!shouldFetchNextPageForChainPair(chainPairIndex, 'deposits')) {
            return []
          }

          return fetchDeposits({
            sender: _address,
            receiver: _address,
            l1Provider: getProvider(chainPair.parentChain),
            l2Provider: getProvider(chainPair.chain),
            pageNumber: _page,
            pageSize: PAGE_SIZE
          })
        })
      )
    }
  )

  const { data: withdrawalsData, error: withdrawalsError } = useSWRImmutable(
    address ? ['tx_list', 'withdrawals', address, withdrawalsPage] : null,
    ([, , _address, _page]) => {
      return Promise.all(
        multiChainFetchList.map((chainPair, chainPairIndex) => {
          if (!shouldFetchNextPageForChainPair(chainPairIndex, 'withdrawals')) {
            return []
          }

          return fetchWithdrawals({
            sender: _address,
            receiver: _address,
            l1Provider: getProvider(chainPair.parentChain),
            l2Provider: getProvider(chainPair.chain),
            pageNumber: _page,
            pageSize: PAGE_SIZE
          })
        })
      )
    }
  )

  function addDeposits(transactions: Deposit[][]) {
    const fetchedSomeData = transactions.some(item => item.length > 0)

    if (fetchedSomeData) {
      setDeposits(prevDeposits => {
        return transactions.map((transactionsForChainPair, chainPairIndex) => [
          ...(prevDeposits[chainPairIndex] ?? []),
          ...(transactionsForChainPair ?? [])
        ])
      })
      setDepositsPage(prevPage => prevPage + 1)
    } else {
      setDepositsLoading(false)
    }
  }

  function addWithdrawals(transactions: Withdrawal[][]) {
    const fetchedSomeData = transactions.some(item => item.length > 0)

    if (fetchedSomeData) {
      setWithdrawals(prevWithdrawal => {
        return transactions.map((transactionsForChainPair, chainPairIndex) => [
          ...(prevWithdrawal[chainPairIndex] ?? []),
          ...(transactionsForChainPair ?? [])
        ])
      })
      setWithdrawalsPage(prevPage => prevPage + 1)
    } else {
      setWithdrawalsLoading(false)
    }
  }

  useEffect(() => {
    if (!depositsData) {
      return
    }
    addDeposits(depositsData)
  }, [depositsData])

  useEffect(() => {
    if (!withdrawalsData) {
      return
    }
    addWithdrawals(withdrawalsData)
  }, [withdrawalsData])

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
  // Pause fetching after specified amount of days. User can resume fetching to get another batch.
  const PAUSE_SIZE_DAYS = 30
  // Also pause fetching after specified number of transactions. Just in case user made a lot in the recent days and it's good for local env.
  const PAUSE_SIZE_TX_COUNT = 30

  const [, setPauseCount] = useState(0)
  const [fetching, setFetching] = useState(true)

  const { data, loading, error } = useTransactionHistoryWithoutStatuses(address)
  const { cache } = useSWRConfig()

  const getCacheKey = useCallback(
    (pageNumber: number, prevPageTxs: MergedTransaction[] | undefined) => {
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
    setSize: setPage
  } = useSWRInfinite(getCacheKey, ([, , _page]) => {
    const startIndex = _page * MAX_BATCH_SIZE
    const endIndex = startIndex + MAX_BATCH_SIZE

    return Promise.all(
      data.slice(startIndex, endIndex).map(transformTransaction)
    )
  })

  const transactions: MergedTransaction[] = (txPages || []).flat()

  const latestTransactionDaysFromNow = useMemo(() => {
    return dayjs().diff(
      dayjs(transactions[transactions.length - 1]?.createdAt),
      'days'
    )
  }, [transactions])

  function pause() {
    setFetching(false)
  }

  function resume() {
    setFetching(true)
  }

  const addPendingTransaction = useCallback(
    (tx: MergedTransaction) => {
      const cacheKey = getCacheKey(0, undefined)

      if (!cacheKey || !isTxPending(tx)) {
        return
      }

      const prevTransactions =
        (cache.get(unstable_serialize(cacheKey))
          ?.data as MergedTransaction[]) || []

      mutate(cacheKey, [tx, ...prevTransactions], true)
    },
    [cache, getCacheKey]
  )

  useEffect(() => {
    if (!txPages || !fetching) {
      return
    }

    const lastTxPage = txPages[txPages.length - 1]

    if (!lastTxPage) {
      return
    }

    // we use setter to access the previous value to get accurate reading
    // we will also increment it if fetching gets paused
    setPauseCount(prevPauseCount => {
      // max timestamp is our threshold where we stop fetching transactions for this iteration
      // it gets incremented by PAUSE_SIZE_DAYS with each iteration
      const maxTimestamp = dayjs()
        .subtract(PAUSE_SIZE_DAYS * (prevPauseCount + 1), 'days')
        .valueOf()

      // get the latest transaction, we will use its timestamp to see if we went past maximum number of fetched days
      const lastTx = lastTxPage[lastTxPage.length - 1]
      const isPastDaysThreshold =
        lastTx && lastTx.createdAt && lastTx.createdAt <= maxTimestamp

      // also check if we fetched enough txs to stop
      const maxTxCount = PAUSE_SIZE_TX_COUNT * (prevPauseCount + 1)
      const isPastTxCountThreshold = txPages.flat().length >= maxTxCount

      // check if our latest transaction is past our lookup threshold
      if (isPastDaysThreshold || isPastTxCountThreshold) {
        // if yes, we pause
        // we also increment pause count so the next iteration can calculate max timestamp
        pause()
        return prevPauseCount + 1
      }

      // otherwise do not pause, we also keep the pause count as-is
      return prevPauseCount
    })

    // mapped data is a full page, so we need to fetch more pages
    if (lastTxPage.length === MAX_BATCH_SIZE) {
      setPage(prevPage => prevPage + 1)
    } else {
      setFetching(false)
    }
  }, [txPages, fetching])

  if (loading || error) {
    return {
      data: { transactions: [], numberOfDays: 0 },
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
      numberOfDays: latestTransactionDaysFromNow
    },
    loading: fetching,
    completed: transactions.length === data.length,
    error: txPagesError ?? error,
    pause,
    resume,
    addPendingTransaction
  }
}
