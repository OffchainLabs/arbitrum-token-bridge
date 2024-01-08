import { useAccount, useNetwork } from 'wagmi'
import useSWRImmutable from 'swr/immutable'
import useSWRInfinite from 'swr/infinite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import {
  ChainId,
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
  getDepositsWithoutStatusesFromCache,
  getProvider,
  getUpdatedCctpTransfer,
  getUpdatedEthDeposit,
  getUpdatedTokenDeposit,
  getUpdatedWithdrawal,
  isCctpTransfer,
  isSameTransaction,
  isTxPending
} from '../components/TransactionHistory/helpers'
import { useIsTestnetMode } from './useIsTestnetMode'
import { useAccountType } from './useAccountType'
import {
  shouldIncludeReceivedTxs,
  shouldIncludeSentTxs
} from '../util/SubgraphUtils'

export type UseTransactionHistoryResult = {
  transactions: MergedTransaction[]
  loading: boolean
  completed: boolean
  error: unknown
  failedChainPairs: ChainPair[]
  pause: () => void
  resume: () => void
  addPendingTransaction: (tx: MergedTransaction) => void
  updatePendingTransaction: (tx: MergedTransaction) => void
}

export type ChainPair = { parentChain: ChainId; chain: ChainId }

export type Deposit = Transaction

export type Withdrawal =
  | FetchWithdrawalsFromSubgraphResult
  | WithdrawalInitiated
  | EthWithdrawal

type DepositOrWithdrawal = Deposit | Withdrawal
export type Transfer = DepositOrWithdrawal | MergedTransaction

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
    parentChain: ChainId.ArbitrumOne,
    chain: ChainId.Xai
  },
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

function getTxIdFromTransaction(tx: Transfer) {
  if (isCctpTransfer(tx)) {
    return tx.txId
  }
  if (isDeposit(tx)) {
    return tx.txID
  }
  if (isWithdrawalFromSubgraph(tx)) {
    return tx.l2TxHash
  }
  if (isTokenWithdrawal(tx)) {
    return tx.txHash
  }
  return tx.l2TxHash
}

/**
 * Fetches transaction history only for deposits and withdrawals, without their statuses.
 */
const useTransactionHistoryWithoutStatuses = (
  address: `0x${string}` | undefined
) => {
  const { chain } = useNetwork()
  const [isTestnetMode] = useIsTestnetMode()
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  // Check what type of CCTP (deposit, withdrawal or all) to fetch
  // We need this because of Smart Contract Wallets
  const cctpTypeToFetch = useCallback(
    (chainPair: ChainPair): 'deposits' | 'withdrawals' | 'all' | undefined => {
      if (isLoadingAccountType || !chain) {
        return undefined
      }
      if (isSmartContractWallet) {
        // fetch based on the connected network
        if (chain.id === chainPair.parentChain) {
          return 'deposits'
        }
        if (chain.id === chainPair.chain) {
          return 'withdrawals'
        }
        return undefined
      }
      // EOA
      // fetch all for testnet mode, do not fetch testnets if testnet mode disabled
      if (isTestnetMode) {
        return 'all'
      }
      return isNetwork(chainPair.parentChain).isTestnet ? undefined : 'all'
    },
    [isSmartContractWallet, isLoadingAccountType, chain, isTestnetMode]
  )

  const cctpTransfersMainnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Ethereum,
    l2ChainId: ChainId.ArbitrumOne,
    pageNumber: 0,
    pageSize: cctpTypeToFetch({
      parentChain: ChainId.Ethereum,
      chain: ChainId.ArbitrumOne
    })
      ? 1000
      : 0,
    type:
      cctpTypeToFetch({
        parentChain: ChainId.Ethereum,
        chain: ChainId.ArbitrumOne
      }) ?? 'all'
  })

  const cctpTransfersTestnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Goerli,
    l2ChainId: ChainId.ArbitrumGoerli,
    pageNumber: 0,
    pageSize: cctpTypeToFetch({
      parentChain: ChainId.Goerli,
      chain: ChainId.ArbitrumGoerli
    })
      ? 1000
      : 0,
    type:
      cctpTypeToFetch({
        parentChain: ChainId.Goerli,
        chain: ChainId.ArbitrumGoerli
      }) ?? 'all'
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

  const { data: failedChainPairs, mutate: addFailedChainPair } =
    useSWRImmutable<ChainPair[]>(
      address ? ['failed_chain_pairs', address] : null
    )

  const fetcher = useCallback(
    (type: 'deposits' | 'withdrawals') => {
      if (!chain) {
        return []
      }

      const fetcherFn = type === 'deposits' ? fetchDeposits : fetchWithdrawals

      return Promise.all(
        multiChainFetchList
          .filter(chainPair => {
            if (isSmartContractWallet) {
              // only fetch txs from the connected network
              return [chainPair.parentChain, chainPair.chain].includes(chain.id)
            }
            if (isTestnetMode) {
              // in testnet mode we fetch all chain pairs
              return true
            }
            // otherwise don't fetch testnet chain pairs
            return !isNetwork(chainPair.parentChain).isTestnet
          })
          .map(async chainPair => {
            // SCW address is tied to a specific network
            // that's why we need to limit shown txs either to sent or received funds
            // otherwise we'd display funds for a different network, which could be someone else's account
            const isConnectedToParentChain = chainPair.parentChain === chain.id

            const includeSentTxs = shouldIncludeSentTxs({
              type,
              isSmartContractWallet,
              isConnectedToParentChain
            })

            const includeReceivedTxs = shouldIncludeReceivedTxs({
              type,
              isSmartContractWallet,
              isConnectedToParentChain
            })
            try {
              return await fetcherFn({
                sender: includeSentTxs ? address : undefined,
                receiver: includeReceivedTxs ? address : undefined,
                l1Provider: getProvider(chainPair.parentChain),
                l2Provider: getProvider(chainPair.chain),
                pageNumber: 0,
                pageSize: 1000
              })
            } catch {
              addFailedChainPair(prevFailedChainPairs => {
                if (!prevFailedChainPairs) {
                  return [chainPair]
                }
                if (
                  typeof prevFailedChainPairs.find(
                    prevPair =>
                      prevPair.parentChain === chainPair.parentChain &&
                      prevPair.chain === chainPair.chain
                  ) !== 'undefined'
                ) {
                  // already added
                  return prevFailedChainPairs
                }

                return [...prevFailedChainPairs, chainPair]
              })

              return []
            }
          })
      )
    },
    [address, isTestnetMode, addFailedChainPair, isSmartContractWallet, chain]
  )

  const shouldFetch = address && chain && !isLoadingAccountType

  const {
    data: depositsData,
    error: depositsError,
    isLoading: depositsLoading
  } = useSWRImmutable(
    shouldFetch ? ['tx_list', 'deposits', address, isTestnetMode] : null,
    () => fetcher('deposits')
  )

  const {
    data: withdrawalsData,
    error: withdrawalsError,
    isLoading: withdrawalsLoading
  } = useSWRImmutable(
    shouldFetch ? ['tx_list', 'withdrawals', address, isTestnetMode] : null,
    () => fetcher('withdrawals')
  )

  const deposits = (depositsData || []).flat()

  const withdrawals = (withdrawalsData || []).flat()

  // merge deposits and withdrawals and sort them by date
  const transactions = [
    ...deposits,
    ...withdrawals,
    ...combinedCctpTransfers
  ].flat()

  return {
    data: transactions,
    loading: depositsLoading || withdrawalsLoading || cctpLoading,
    error: depositsError ?? withdrawalsError,
    failedChainPairs: failedChainPairs || []
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
): UseTransactionHistoryResult => {
  const [isTestnetMode] = useIsTestnetMode()
  const { chain } = useNetwork()
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()
  const { connector } = useAccount()
  // max number of transactions mapped in parallel
  const MAX_BATCH_SIZE = 10
  // Pause fetching after specified number of days. User can resume fetching to get another batch.
  const PAUSE_SIZE_DAYS = 30

  const [fetching, setFetching] = useState(true)
  const [pauseCount, setPauseCount] = useState(0)

  const {
    data,
    loading: isLoadingTxsWithoutStatus,
    error,
    failedChainPairs
  } = useTransactionHistoryWithoutStatuses(address)

  const getCacheKey = useCallback(
    (pageNumber: number, prevPageTxs: MergedTransaction[]) => {
      if (prevPageTxs) {
        if (prevPageTxs.length === 0) {
          // THIS is the last page
          return null
        }
      }

      return address && !isLoadingTxsWithoutStatus
        ? (['complete_tx_list', address, pageNumber, data] as const)
        : null
    },
    [address, isLoadingTxsWithoutStatus, data]
  )

  const depositsFromCache = useMemo(() => {
    if (isLoadingAccountType || !chain) {
      return []
    }
    return getDepositsWithoutStatusesFromCache(address)
      .filter(tx =>
        isTestnetMode ? true : !isNetwork(tx.parentChainId).isTestnet
      )
      .filter(tx => {
        if (isSmartContractWallet) {
          // only include txs for the connected network
          return tx.parentChainId === chain.id
        }
        return tx
      })
  }, [
    address,
    isTestnetMode,
    isLoadingAccountType,
    isSmartContractWallet,
    chain
  ])

  const {
    data: txPages,
    error: txPagesError,
    size: page,
    setSize: setPage,
    mutate: mutateTxPages,
    isValidating,
    isLoading: isLoadingFirstPage
  } = useSWRInfinite(
    getCacheKey,
    ([, , _page, _data]) => {
      // we get cached data and dedupe here because we need to ensure _data never mutates
      // otherwise, if we added a new tx to cache, it would return a new reference and cause the SWR key to update, resulting in refetching
      const dataWithCache = [..._data, ...depositsFromCache]

      // duplicates may occur when txs are taken from the local storage
      // we don't use Set because it wouldn't dedupe objects with different reference (we fetch them from different sources)
      const dedupedTransactions = Array.from(
        new Map(
          dataWithCache.map(tx => [
            `${tx.parentChainId}-${tx.childChainId}-${getTxIdFromTransaction(
              tx
            )?.toLowerCase()}}`,
            tx
          ])
        ).values()
      ).sort(sortByTimestampDescending)

      const startIndex = _page * MAX_BATCH_SIZE
      const endIndex = startIndex + MAX_BATCH_SIZE

      return Promise.all(
        dedupedTransactions
          .slice(startIndex, endIndex)
          .map(transformTransaction)
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

  // based on an example from SWR
  // https://swr.vercel.app/examples/infinite-loading
  const isLoadingMore =
    page > 0 &&
    typeof txPages !== 'undefined' &&
    typeof txPages[page - 1] === 'undefined'

  const completed =
    !isLoadingFirstPage &&
    typeof txPages !== 'undefined' &&
    data.length === txPages.flat().length

  // transfers initiated by the user during the current session
  // we store it separately as there are a lot of side effects when mutating SWRInfinite
  const { data: newTransactionsData, mutate: mutateNewTransactionsData } =
    useSWRImmutable<MergedTransaction[]>(
      address ? ['new_tx_list', address] : null
    )

  const transactions: MergedTransaction[] = useMemo(() => {
    const txs = [...(newTransactionsData || []), ...(txPages || [])].flat()
    // make sure txs are for the current account, we can have a mismatch when switching accounts for a bit
    return txs.filter(tx =>
      [tx.sender?.toLowerCase(), tx.destination?.toLowerCase()].includes(
        address?.toLowerCase()
      )
    )
  }, [newTransactionsData, txPages, address])

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
        ...txPages.slice(0, pageNumberToUpdate),
        updatedPage,
        ...txPages.slice(pageNumberToUpdate + 1)
      ]

      mutateTxPages(newTxPages, false)
    },
    [mutateNewTransactionsData, mutateTxPages, newTransactionsData, txPages]
  )

  const updatePendingTransaction = useCallback(
    async (tx: MergedTransaction) => {
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
      if (tx.assetType === AssetType.ETH) {
        const updatedEthDeposit = await getUpdatedEthDeposit(tx)
        updateCachedTransaction(updatedEthDeposit)
        return
      }

      // Token deposit
      const updatedTokenDeposit = await getUpdatedTokenDeposit(tx)
      updateCachedTransaction(updatedTokenDeposit)
    },
    [updateCachedTransaction]
  )

  useEffect(() => {
    if (!runFetcher || !connector) {
      return
    }
    connector.on('change', e => {
      // reset state on account change
      if (e.account) {
        setPage(1)
        setPauseCount(0)
        setFetching(true)
      }
    })
  }, [connector, runFetcher, setPage])

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

  function pause() {
    setFetching(false)
  }

  function resume() {
    setFetching(true)
    setPage(prevPage => prevPage + 1)
  }

  if (isLoadingTxsWithoutStatus || error) {
    return {
      transactions: [],
      loading: isLoadingTxsWithoutStatus,
      error,
      failedChainPairs: [],
      completed: true,
      pause,
      resume,
      addPendingTransaction,
      updatePendingTransaction
    }
  }

  return {
    transactions,
    loading: isLoadingFirstPage || isLoadingMore,
    completed,
    error: txPagesError ?? error,
    failedChainPairs,
    pause,
    resume,
    addPendingTransaction,
    updatePendingTransaction
  }
}
