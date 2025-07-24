import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'
import useSWRInfinite from 'swr/infinite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import pLimit from 'p-limit'

import { getChains, getChildChainIds, isNetwork } from '../util/networks'
import { ChainId } from '../types/ChainId'
import {
  fetchWithdrawals,
  FetchWithdrawalsParams
} from '../util/withdrawals/fetchWithdrawals'
import { fetchDeposits } from '../util/deposits/fetchDeposits'
import {
  AssetType,
  L2ToL1EventResultPlus,
  WithdrawalInitiated
} from './arbTokenBridge.types'
import { isTeleportTx, Transaction } from '../types/Transactions'
import { MergedTransaction } from '../state/app/state'
import {
  normalizeTimestamp,
  transformDeposit,
  transformWithdrawal
} from '../state/app/utils'
import {
  EthWithdrawal,
  isTokenWithdrawal,
  mapETHWithdrawalToL2ToL1EventResult,
  mapTokenWithdrawalFromEventLogsToL2ToL1EventResult,
  mapWithdrawalFromSubgraphToL2ToL1EventResult
} from '../util/withdrawals/helpers'
import { WithdrawalFromSubgraph } from '../util/withdrawals/fetchWithdrawalsFromSubgraph'
import { updateAdditionalDepositData } from '../util/deposits/helpers'
import { useCctpFetching } from '../state/cctpState'
import {
  getDepositsWithoutStatusesFromCache,
  getUpdatedCctpTransfer,
  getUpdatedEthDeposit,
  getUpdatedTeleportTransfer,
  getUpdatedRetryableDeposit,
  getUpdatedWithdrawal,
  isCctpTransfer,
  isSameTransaction,
  isTxPending,
  isOftTransfer,
  getUpdatedLifiTransfer,
  isLifiTransfer
} from '../components/TransactionHistory/helpers'
import { useIsTestnetMode } from './useIsTestnetMode'
import { useAccountType } from './useAccountType'
import {
  shouldIncludeReceivedTxs,
  shouldIncludeSentTxs
} from '../util/SubgraphUtils'
import { isValidTeleportChainPair } from '@/token-bridge-sdk/teleport'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { Address } from '../util/AddressUtils'
import {
  fetchTeleports,
  TeleportFromSubgraph
} from '../util/teleports/fetchTeleports'
import {
  isTransferTeleportFromSubgraph,
  transformTeleportFromSubgraph
} from '../util/teleports/helpers'
import { captureSentryErrorWithExtraData } from '../util/SentryUtils'
import { DisabledFeatures } from './useArbQueryParams'
import {
  getUpdatedOftTransfer,
  updateAdditionalLayerZeroData,
  useOftTransactionHistory
} from './useOftTransactionHistory'
import { create } from 'zustand'
import { useLifiMergedTransactionCacheStore } from './useLifiMergedTransactionCacheStore'
import { useDisabledFeatures } from './useDisabledFeatures'

const BATCH_FETCH_BLOCKS: { [key: number]: number } = {
  33139: 5_000_000, // ApeChain
  4078: 10_000 // Muster
}

export type UseTransactionHistoryResult = {
  transactions: MergedTransaction[]
  loading: boolean
  completed: boolean
  error: unknown
  failedChainPairs: ChainPair[]
  pause: () => void
  resume: () => void
  addPendingTransaction: (tx: MergedTransaction) => void
  updatePendingTransaction: (tx: MergedTransaction) => Promise<void>
}

export type ChainPair = { parentChainId: ChainId; childChainId: ChainId }

export type Deposit = Transaction

export type Withdrawal =
  | WithdrawalFromSubgraph
  | WithdrawalInitiated
  | EthWithdrawal

type DepositOrWithdrawal = Deposit | Withdrawal
export type Transfer =
  | DepositOrWithdrawal
  | MergedTransaction
  | TeleportFromSubgraph

type ForceFetchReceivedStore = {
  forceFetchReceived: boolean
  setForceFetchReceived: (forceFetchReceived: boolean) => void
}

export const useForceFetchReceived = create<ForceFetchReceivedStore>(set => ({
  forceFetchReceived: false,
  setForceFetchReceived: forceFetchReceived => set({ forceFetchReceived })
}))

function getTransactionTimestamp(tx: Transfer) {
  if (isLifiTransfer(tx)) {
    return tx.createdAt ?? 0
  }

  if (isCctpTransfer(tx)) {
    return normalizeTimestamp(tx.createdAt ?? 0)
  }

  if (isOftTransfer(tx)) {
    return normalizeTimestamp(tx.createdAt ?? 0)
  }

  if (isTransferTeleportFromSubgraph(tx)) {
    return normalizeTimestamp(tx.timestamp)
  }

  if (isDeposit(tx)) {
    return normalizeTimestamp(tx.timestampCreated ?? 0)
  }

  if (isWithdrawalFromSubgraph(tx)) {
    return normalizeTimestamp(tx.l2BlockTimestamp)
  }

  return normalizeTimestamp(tx.timestamp?.toNumber() ?? 0)
}

function sortByTimestampDescending(a: Transfer, b: Transfer) {
  return getTransactionTimestamp(a) > getTransactionTimestamp(b) ? -1 : 1
}

function getMultiChainFetchList(): ChainPair[] {
  return getChains().flatMap(chain => {
    // We only grab child chains because we don't want duplicates and we need the parent chain
    // Although the type is correct here we default to an empty array for custom networks backwards compatibility
    const childChainIds = getChildChainIds(chain)

    const isParentChain = childChainIds.length > 0

    if (!isParentChain) {
      // Skip non-parent chains
      return []
    }

    // For each destination chain, map to an array of ChainPair objects
    return childChainIds.map(childChainId => ({
      parentChainId: chain.chainId,
      childChainId: childChainId
    }))
  })
}

function isWithdrawalFromSubgraph(
  tx: Withdrawal
): tx is WithdrawalFromSubgraph {
  return tx.source === 'subgraph'
}

function isDeposit(tx: DepositOrWithdrawal): tx is Deposit {
  return tx.direction === 'deposit'
}

async function transformTransaction(tx: Transfer): Promise<MergedTransaction> {
  // LifiTransaction are already MergedTransaction
  if (isLifiTransfer(tx)) {
    return tx
  }

  // teleport-from-subgraph doesn't have a child-chain-id, we detect it later, hence, an early return
  if (isTransferTeleportFromSubgraph(tx)) {
    return await transformTeleportFromSubgraph(tx)
  }

  const parentProvider = getProviderForChainId(tx.parentChainId)
  const childProvider = getProviderForChainId(tx.childChainId)

  if (isCctpTransfer(tx)) {
    return tx
  }

  if (isOftTransfer(tx)) {
    return await updateAdditionalLayerZeroData(tx)
  }

  if (isDeposit(tx)) {
    return transformDeposit(await updateAdditionalDepositData(tx))
  }

  let withdrawal: L2ToL1EventResultPlus | undefined

  if (isWithdrawalFromSubgraph(tx)) {
    withdrawal = await mapWithdrawalFromSubgraphToL2ToL1EventResult({
      withdrawal: tx,
      l1Provider: parentProvider,
      l2Provider: childProvider
    })
  } else {
    if (isTokenWithdrawal(tx)) {
      withdrawal = await mapTokenWithdrawalFromEventLogsToL2ToL1EventResult({
        result: tx,
        l1Provider: parentProvider,
        l2Provider: childProvider
      })
    } else {
      withdrawal = await mapETHWithdrawalToL2ToL1EventResult({
        event: tx,
        l1Provider: parentProvider,
        l2Provider: childProvider
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
  if (isTransferTeleportFromSubgraph(tx)) {
    return tx.transactionHash
  }

  if (isCctpTransfer(tx) || isOftTransfer(tx)) {
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
  return tx.l2TxHash ?? tx.transactionHash
}

function getCacheKeyFromTransaction(tx: Transfer) {
  const txId = getTxIdFromTransaction(tx)
  if (!txId) {
    return undefined
  }
  return `${tx.parentChainId}-${txId.toLowerCase()}`
}

// remove the duplicates from the transactions passed
function dedupeTransactions(txs: Transfer[]) {
  return Array.from(
    new Map(txs.map(tx => [getCacheKeyFromTransaction(tx), tx])).values()
  )
}

export async function fetchWithdrawalsInBatches(
  params: FetchWithdrawalsParams & {
    batchSizeBlocks?: number
  }
): Promise<Withdrawal[]> {
  const latestBlockNumber = await params.l2Provider.getBlockNumber()

  const fromBlock = params.fromBlock ?? 1
  const toBlock = params.toBlock ?? latestBlockNumber

  if (toBlock < fromBlock) {
    throw new Error(
      `toBlock (${toBlock}) cannot be lower than fromBlock (${fromBlock})`
    )
  }

  const batchSizeBlocks = params.batchSizeBlocks ?? 5_000_000
  const batchCount = Math.ceil((toBlock - fromBlock) / batchSizeBlocks)

  // Max parallel fetches to avoid 429 errors
  const limit = pLimit(10)

  const childChainId = (await params.l2Provider.getNetwork()).chainId

  const promises = Array.from({ length: batchCount }, (_, i) => {
    // Math.min makes sure we don't fetch above toBlock
    const fromBlockForBatch = Math.min(fromBlock + i * batchSizeBlocks, toBlock)
    const toBlockForBatch = Math.min(
      fromBlockForBatch + batchSizeBlocks,
      toBlock
    )

    return limit(async () => {
      performance.mark(
        `withdrawal batch start chainId:${childChainId} ${i}/${batchCount}`
      )
      const result = await fetchWithdrawals({
        ...params,
        fromBlock: fromBlockForBatch,
        toBlock: toBlockForBatch
      })
      performance.mark(
        `withdrawal batch end chainId:${childChainId} ${i}/${batchCount}`
      )
      return result
    })
  })

  const results = await Promise.all(promises)

  return results.flat()
}

/**
 * Fetches transaction history only for deposits and withdrawals, without their statuses.
 */
const useTransactionHistoryWithoutStatuses = (address: Address | undefined) => {
  const { chain } = useAccount()
  const [isTestnetMode] = useIsTestnetMode()
  const { accountType, isLoading: isLoadingAccountType } =
    useAccountType(address)
  const isSmartContractWallet = accountType === 'smart-contract-wallet'
  const { isFeatureDisabled } = useDisabledFeatures()
  const isTxHistoryEnabled = !isFeatureDisabled(DisabledFeatures.TX_HISTORY)

  const forceFetchReceived = useForceFetchReceived(
    state => state.forceFetchReceived
  )

  const cctpTransfersMainnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Ethereum,
    l2ChainId: ChainId.ArbitrumOne,
    pageNumber: 0,
    pageSize: isTxHistoryEnabled ? 1000 : 0,
    type: 'all'
  })

  const cctpTransfersTestnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Sepolia,
    l2ChainId: ChainId.ArbitrumSepolia,
    pageNumber: 0,
    pageSize: isTxHistoryEnabled ? 1000 : 0,
    type: 'all'
  })

  const combinedCctpMainnetTransfers = [
    ...(cctpTransfersMainnet.deposits?.completed || []),
    ...(cctpTransfersMainnet.withdrawals?.completed || []),
    ...(cctpTransfersMainnet.deposits?.pending || []),
    ...(cctpTransfersMainnet.withdrawals?.pending || [])
  ]

  const combinedCctpTestnetTransfers = [
    ...(cctpTransfersTestnet.deposits?.completed || []),
    ...(cctpTransfersTestnet.withdrawals?.completed || []),
    ...(cctpTransfersTestnet.deposits?.pending || []),
    ...(cctpTransfersTestnet.withdrawals?.pending || [])
  ]

  const cctpLoading =
    cctpTransfersMainnet.isLoadingDeposits ||
    cctpTransfersMainnet.isLoadingWithdrawals ||
    cctpTransfersTestnet.isLoadingDeposits ||
    cctpTransfersTestnet.isLoadingWithdrawals

  const { transactions: oftTransfers, isLoading: oftLoading } =
    useOftTransactionHistory({
      walletAddress: isTxHistoryEnabled ? address : undefined,
      isTestnet: isTestnetMode
    })

  const { data: failedChainPairs, mutate: addFailedChainPair } =
    useSWRImmutable<ChainPair[]>(
      address ? ['failed_chain_pairs', address] : null
    )

  const fetcher = useCallback(
    (type: 'deposits' | 'withdrawals') => {
      if (!chain) {
        return []
      }

      return Promise.all(
        getMultiChainFetchList()
          .filter(chainPair => {
            if (isSmartContractWallet) {
              // only fetch txs from the connected network
              return [chainPair.parentChainId, chainPair.childChainId].includes(
                chain.id
              )
            }

            return (
              isNetwork(chainPair.parentChainId).isTestnet === isTestnetMode
            )
          })
          .map(async chainPair => {
            // SCW address is tied to a specific network
            // that's why we need to limit shown txs either to sent or received funds
            // otherwise we'd display funds for a different network, which could be someone else's account
            const isConnectedToParentChain =
              chainPair.parentChainId === chain.id

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
              // early check for fetching teleport
              if (
                isValidTeleportChainPair({
                  sourceChainId: chainPair.parentChainId,
                  destinationChainId: chainPair.childChainId
                })
              ) {
                // teleporter does not support withdrawals
                if (type === 'withdrawals') return []

                return await fetchTeleports({
                  sender: includeSentTxs ? address : undefined,
                  receiver: includeReceivedTxs ? address : undefined,
                  parentChainProvider: getProviderForChainId(
                    chainPair.parentChainId
                  ),
                  childChainProvider: getProviderForChainId(
                    chainPair.childChainId
                  ),
                  pageNumber: 0,
                  pageSize: 1000
                })
              }

              const batchSizeBlocks = BATCH_FETCH_BLOCKS[chainPair.childChainId]

              const withdrawalFn =
                typeof batchSizeBlocks === 'number'
                  ? fetchWithdrawalsInBatches
                  : fetchWithdrawals

              const fetcherFn =
                type === 'deposits' ? fetchDeposits : withdrawalFn

              // else, fetch deposits or withdrawals
              return await fetcherFn({
                sender: includeSentTxs ? address : undefined,
                receiver: includeReceivedTxs ? address : undefined,
                l1Provider: getProviderForChainId(chainPair.parentChainId),
                l2Provider: getProviderForChainId(chainPair.childChainId),
                pageNumber: 0,
                pageSize: 1000,
                forceFetchReceived,
                batchSizeBlocks
              })
            } catch {
              addFailedChainPair(prevFailedChainPairs => {
                if (!prevFailedChainPairs) {
                  return [chainPair]
                }
                if (
                  typeof prevFailedChainPairs.find(
                    prevPair =>
                      prevPair.parentChainId === chainPair.parentChainId &&
                      prevPair.childChainId === chainPair.childChainId
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
    [
      address,
      isTestnetMode,
      addFailedChainPair,
      isSmartContractWallet,
      chain,
      forceFetchReceived
    ]
  )

  const shouldFetch = address && !isLoadingAccountType && isTxHistoryEnabled

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
    shouldFetch
      ? ['tx_list', 'withdrawals', address, isTestnetMode, forceFetchReceived]
      : null,
    () => fetcher('withdrawals')
  )

  const deposits = (depositsData || []).flat()

  const withdrawals = (withdrawalsData || []).flat()

  // merge deposits and withdrawals and sort them by date
  const transactions: Transfer[] = [
    ...deposits,
    ...withdrawals,
    ...(isTestnetMode
      ? combinedCctpTestnetTransfers
      : combinedCctpMainnetTransfers),
    ...oftTransfers
  ].flat()

  return {
    data: transactions,
    loading:
      isLoadingAccountType ||
      depositsLoading ||
      withdrawalsLoading ||
      cctpLoading ||
      oftLoading,
    error: depositsError ?? withdrawalsError,
    failedChainPairs: failedChainPairs || []
  }
}

/**
 * Maps additional info to previously fetches transaction history, starting with the earliest data.
 * This is done in small batches to safely meet RPC limits.
 */
export const useTransactionHistory = (
  address: Address | undefined,
  // TODO: look for a solution to this. It's used for now so that useEffect that handles pagination runs only a single instance.
  { runFetcher = false } = {}
): UseTransactionHistoryResult => {
  const [isTestnetMode] = useIsTestnetMode()
  const { chain } = useAccount()
  const { accountType, isLoading: isLoadingAccountType } =
    useAccountType(address)
  const isSmartContractWallet = accountType === 'smart-contract-wallet'

  const { isFeatureDisabled } = useDisabledFeatures()
  const isTxHistoryEnabled = !isFeatureDisabled(DisabledFeatures.TX_HISTORY)

  const lifiTransactions = useLifiMergedTransactionCacheStore(
    state => state.transactions
  )
  const { connector } = useAccount()
  // max number of transactions mapped in parallel
  const MAX_BATCH_SIZE = 3
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

      return address && !isLoadingTxsWithoutStatus && !isLoadingAccountType
        ? (['complete_tx_list', address, pageNumber, data] as const)
        : null
    },
    [address, isLoadingTxsWithoutStatus, data, isLoadingAccountType]
  )

  const depositsFromCache = useMemo(() => {
    if (isLoadingAccountType || !chain || !isTxHistoryEnabled) {
      return []
    }
    return getDepositsWithoutStatusesFromCache(address)
      .filter(tx => isNetwork(tx.parentChainId).isTestnet === isTestnetMode)
      .filter(tx => {
        const chainPairExists = getMultiChainFetchList().some(chainPair => {
          return (
            chainPair.parentChainId === tx.parentChainId &&
            chainPair.childChainId === tx.childChainId
          )
        })

        if (!chainPairExists) {
          // chain pair doesn't exist in the fetch list but exists in cached transactions
          // this could happen if user made a transfer with a custom Orbit chain and then removed the network
          // we don't want to include these txs as it would cause tx history errors
          return false
        }

        if (isSmartContractWallet) {
          // only include txs for the connected network
          return tx.parentChainId === chain.id
        }
        return true
      })
  }, [
    address,
    isTestnetMode,
    isLoadingAccountType,
    isSmartContractWallet,
    chain,
    isTxHistoryEnabled
  ])

  const lifiTransactionsFromCache = useMemo(() => {
    if (
      !useLifiMergedTransactionCacheStore.persist.hasHydrated ||
      !address ||
      !isTxHistoryEnabled
    ) {
      return []
    }

    return lifiTransactions[address] || []
  }, [address, lifiTransactions, isTxHistoryEnabled])

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
      const dataWithCache = _data.concat(depositsFromCache)

      // duplicates may occur when txs are taken from the local storage
      // we don't use Set because it wouldn't dedupe objects with different reference (we fetch them from different sources)
      // Lifi transactions don't need deduping from other transactions, they are only fetched from localStorage
      const dedupedTransactions = dedupeTransactions(dataWithCache)
        .concat(lifiTransactionsFromCache)
        .sort(sortByTimestampDescending)

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
      mutateTxPages(prevTxPages => {
        if (!prevTxPages) {
          return
        }

        let pageNumberToUpdate = 0

        // search cache for the tx to update
        while (
          !prevTxPages[pageNumberToUpdate]?.find(oldTx =>
            isSameTransaction(oldTx, newTx)
          )
        ) {
          pageNumberToUpdate++

          if (pageNumberToUpdate > prevTxPages.length) {
            // tx not found
            return prevTxPages
          }
        }

        const oldPageToUpdate = prevTxPages[pageNumberToUpdate]

        if (!oldPageToUpdate) {
          return prevTxPages
        }

        // replace the old tx with the new tx
        const updatedPage = oldPageToUpdate.map(oldTx => {
          return isSameTransaction(oldTx, newTx) ? newTx : oldTx
        })

        // all old pages including the new updated page
        const newTxPages = [
          ...prevTxPages.slice(0, pageNumberToUpdate),
          updatedPage,
          ...prevTxPages.slice(pageNumberToUpdate + 1)
        ]

        return newTxPages
      }, false)
    },
    [mutateNewTransactionsData, mutateTxPages, newTransactionsData]
  )

  const updatePendingTransaction = useCallback(
    async (tx: MergedTransaction) => {
      if (!isTxPending(tx)) {
        // if not pending we don't need to check for status, we accept whatever status is passed in
        updateCachedTransaction(tx)
        return
      }

      if (isTeleportTx(tx)) {
        const updatedTeleportTransfer = await getUpdatedTeleportTransfer(tx)
        updateCachedTransaction(updatedTeleportTransfer)
        return
      }

      if (isOftTransfer(tx)) {
        const updatedOftTransfer = await getUpdatedOftTransfer(tx)
        updateCachedTransaction(updatedOftTransfer)
        return
      }

      if (tx.isCctp) {
        const updatedCctpTransfer = await getUpdatedCctpTransfer(tx)
        updateCachedTransaction(updatedCctpTransfer)
        return
      }

      if (isLifiTransfer(tx)) {
        const updatedLifiTransfer = await getUpdatedLifiTransfer(tx)
        updateCachedTransaction(updatedLifiTransfer)
        return
      }

      // ETH or token withdrawal
      if (tx.isWithdrawal) {
        const updatedWithdrawal = await getUpdatedWithdrawal(tx)
        updateCachedTransaction(updatedWithdrawal)
        return
      }

      // eth deposits (either via eth deposit messages or retryable tickets)
      if (tx.assetType === AssetType.ETH) {
        const updatedEthDeposit = await getUpdatedEthDeposit(tx)
        updateCachedTransaction(updatedEthDeposit)
        return
      }

      // token deposits (via retryable tickets)
      const updatedRetryableDeposit = await getUpdatedRetryableDeposit(tx)
      updateCachedTransaction(updatedRetryableDeposit)
    },
    [updateCachedTransaction]
  )

  useEffect(() => {
    if (!runFetcher || !connector) {
      return
    }
    connector.onAccountsChanged = (accounts: string[]) => {
      // reset state on account change
      if (accounts.length > 0) {
        setPage(1)
        setPauseCount(0)
        setFetching(true)
      }
    }
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

  useEffect(() => {
    if (typeof error !== 'undefined') {
      console.warn(error)
      captureSentryErrorWithExtraData({
        error,
        originFunction: 'useTransactionHistoryWithoutStatuses'
      })
    }

    if (typeof txPagesError !== 'undefined') {
      console.warn(txPagesError)
      captureSentryErrorWithExtraData({
        error: txPagesError,
        originFunction: 'useTransactionHistory'
      })
    }
  }, [error, txPagesError])

  function pause() {
    setFetching(false)
  }

  function resume() {
    setFetching(true)
    setPage(prevPage => prevPage + 1)
  }

  if (isLoadingTxsWithoutStatus || error) {
    return {
      transactions: newTransactionsData || [],
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
