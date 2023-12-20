import useSWRImmutable from 'swr/immutable'
import useSWRInfinite from 'swr/infinite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useLocalStorage } from 'react-use'

import {
  ChainId,
  getCustomChainFromLocalStorageById,
  getCustomChainsFromLocalStorage,
  isNetwork
} from '../util/networks'
import { fetchWithdrawals } from '../util/withdrawals/fetchWithdrawals'
import { fetchDeposits } from '../util/deposits/fetchDeposits'
import {
  AssetType,
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
import {
  getProvider,
  getUpdatedCctpTransfer,
  getUpdatedEthDeposit,
  getUpdatedTokenDeposit,
  getUpdatedWithdrawal,
  isSameTransaction,
  isTxPending
} from '../components/TransactionHistory/helpers'
import { testnetModeLocalStorageKey } from '../components/common/SettingsDialog'

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
  updatePendingTransaction: (tx: MergedTransaction) => void
}

export type Deposit = Transaction

export type Withdrawal =
  | FetchWithdrawalsFromSubgraphResult
  | WithdrawalInitiated
  | EthWithdrawal

type DepositOrWithdrawal = Deposit | Withdrawal
type Transfer = DepositOrWithdrawal | MergedTransaction

type ChainPair = { parentChain: ChainId; chain: ChainId }

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

const multiChainFetchList: ChainPair[] = [
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
  },
  ...getCustomChainsFromLocalStorage().map(chain => {
    return {
      parentChain: chain.partnerChainID,
      chain: chain.chainID
    }
  })
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
  return (tx as MergedTransaction).isCctp === true
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

function isTestnetChainPair(chainPair: ChainPair) {
  return isNetwork(chainPair.parentChain).isTestnet
}

function getTransactionsMapKey(tx: MergedTransaction) {
  return `${tx.parentChainId}-${tx.childChainId}-${tx.txId}`
}

/**
 * Fetches transaction history only for deposits and withdrawals, without their statuses.
 */
const useTransactionHistoryWithoutStatuses = (
  address: `0x${string}` | undefined
) => {
  const [isTestnetMode = false] = useLocalStorage<boolean>(
    testnetModeLocalStorageKey
  )

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
    pageSize: isTestnetMode ? 1000 : 0,
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

  const fetcher = useCallback(
    (type: 'deposits' | 'withdrawals') => {
      const fetcherFn = type === 'deposits' ? fetchDeposits : fetchWithdrawals

      return Promise.all(
        multiChainFetchList
          .filter(chainPair => {
            if (isTestnetMode) {
              // in testnet mode we fetch all chain pairs
              return chainPair
            }
            // otherwise don't fetch testnet chain pairs
            return !isTestnetChainPair(chainPair)
          })
          .map(async chainPair => {
            try {
              return await fetcherFn({
                sender: address,
                receiver: address,
                l1Provider: getProvider(chainPair.parentChain),
                l2Provider: getProvider(chainPair.chain),
                pageNumber: 0,
                pageSize: 1000
              })
            } catch (err) {
              const isCustomOrbitChain = !!getCustomChainFromLocalStorageById(
                chainPair.chain
              )

              if (isCustomOrbitChain) {
                // don't throw for custom orbit chains, local node may be offline
                return []
              }

              throw err
            }
          })
      )
    },
    [address, isTestnetMode]
  )

  const {
    data: depositsData,
    error: depositsError,
    isLoading: depositsLoading
  } = useSWRImmutable(
    address ? ['tx_list', 'deposits', address, isTestnetMode] : null,
    () => fetcher('deposits')
  )

  const {
    data: withdrawalsData,
    error: withdrawalsError,
    isLoading: withdrawalsLoading
  } = useSWRImmutable(
    address ? ['tx_list', 'withdrawals', address, isTestnetMode] : null,
    () => fetcher('withdrawals')
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
  address: `0x${string}` | undefined,
  // TODO: look for a solution to this. It's used for now so that useEffect that handles pagination runs only a single instance.
  { runFetcher = false } = {}
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
    setSize: setPage,
    mutate: mutateTxPages,
    isValidating
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
      keepPreviousData: true,
      dedupingInterval: 1_000_000
    }
  )

  // transfers initiated by the user during the current session
  // we store it separately as there are a lot of side effects when mutating SWRInfinite
  const { data: newTransactionsData, mutate: mutateNewTransactionsData } =
    useSWRImmutable<MergedTransaction[]>(
      address ? ['new_tx_list', address] : null
    )

  const transactions: MergedTransaction[] = useMemo(() => {
    return [...(newTransactionsData || []), ...(txPages || [])].flat()
  }, [newTransactionsData, txPages])

  const transactionsMap = useMemo(() => {
    return transactions.reduce<{ [key: string]: MergedTransaction }>(
      (acc, tx) => {
        const key = getTransactionsMapKey(tx)
        acc[key] = tx
        return acc
      },
      {}
    )
  }, [transactions])

  const addPendingTransaction = useCallback(
    (tx: MergedTransaction) => {
      if (!isTxPending(tx)) {
        return
      }

      mutateNewTransactionsData(currentNewTransactions => {
        if (!currentNewTransactions) {
          return [tx]
        }

        return [tx, ...currentNewTransactions]
      })
    },
    [mutateNewTransactionsData]
  )

  const updateCachedTransaction = useCallback(
    (newTx: MergedTransaction) => {
      // check if tx is a new transaction initiated by the user, and update it
      const foundInNewTransactions =
        typeof newTransactionsData?.find(oldTx =>
          isSameTransaction(oldTx, newTx)
        ) !== 'undefined'

      if (foundInNewTransactions) {
        // replace the existing tx with the new tx
        mutateNewTransactionsData(txs =>
          txs?.map(oldTx => {
            return { ...(isSameTransaction(oldTx, newTx) ? newTx : oldTx) }
          })
        )
        return
      }

      // tx not found in the new user initiated transaction list
      // look in the paginated historical data
      if (!txPages) {
        return
      }

      let pageNumberToUpdate = 0

      // search cache for the tx to update
      while (
        !txPages[pageNumberToUpdate]?.find(oldTx =>
          isSameTransaction(oldTx, newTx)
        )
      ) {
        pageNumberToUpdate++

        if (pageNumberToUpdate > txPages.length) {
          // tx not found
          return
        }
      }

      const oldPageToUpdate = txPages[pageNumberToUpdate]

      if (!oldPageToUpdate) {
        return
      }

      // replace the old tx with the new tx
      const updatedPage = oldPageToUpdate.map(oldTx => {
        return isSameTransaction(oldTx, newTx) ? newTx : oldTx
      })

      // all old pages including the new updated page
      const newTxPages = [
        ...[...txPages].slice(0, pageNumberToUpdate),
        updatedPage,
        ...[...txPages].slice(pageNumberToUpdate + 1)
      ]

      mutateTxPages(newTxPages, false)
    },
    [mutateNewTransactionsData, mutateTxPages, newTransactionsData, txPages]
  )

  const updatePendingTransaction = useCallback(
    async (tx: MergedTransaction) => {
      // sanity check, this should never happen
      const found =
        typeof transactionsMap[getTransactionsMapKey(tx)] !== 'undefined'

      if (!found) {
        // tx does not exist
        return
      }

      if (!isTxPending(tx)) {
        // if not pending we don't need to check for status, we accept whatever status is passed in
        updateCachedTransaction(tx)
        return
      }

      if (tx.isCctp) {
        const updatedCctpTransfer = await getUpdatedCctpTransfer(tx)
        updateCachedTransaction(updatedCctpTransfer)
        return
      }

      // ETH or token withdrawal
      if (tx.isWithdrawal) {
        const updatedWithdrawal = await getUpdatedWithdrawal(tx)
        updateCachedTransaction(updatedWithdrawal)
        return
      }

      // ETH deposit
      if (tx.asset === AssetType.ETH) {
        const updatedEthDeposit = await getUpdatedEthDeposit(tx)
        updateCachedTransaction(updatedEthDeposit)
        return
      }

      // Token deposit
      const updatedTokenDeposit = await getUpdatedTokenDeposit(tx)
      updateCachedTransaction(updatedTokenDeposit)
    },
    [transactionsMap, updateCachedTransaction]
  )

  useEffect(() => {
    if (!txPages || !fetching || !runFetcher || isValidating) {
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
  }, [txPages, setPage, page, pauseCount, fetching, runFetcher, isValidating])

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
      addPendingTransaction,
      updatePendingTransaction
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
    addPendingTransaction,
    updatePendingTransaction
  }
}
