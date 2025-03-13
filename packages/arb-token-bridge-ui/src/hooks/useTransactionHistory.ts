import { useAccount, useNetwork } from 'wagmi'
import useSWRImmutable from 'swr/immutable'
import useSWRInfinite from 'swr/infinite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import { getChains, getChildChainIds, isNetwork } from '../util/networks'
import { ChainId } from '../types/ChainId'
import { fetchWithdrawals } from '../util/withdrawals/fetchWithdrawals'
import { fetchDeposits } from '../util/deposits/fetchDeposits'
import {
  AssetType,
  L2ToL1EventResultPlus,
  WithdrawalInitiated
} from './arbTokenBridge.types'
import { isTeleportTx, Transaction } from '../types/Transactions'
import { MergedTransaction } from '../state/app/state'
import {
  isCustomDestinationAddressTx,
  normalizeTimestamp,
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
  getUpdatedCctpTransfer,
  getUpdatedEthDeposit,
  getUpdatedTeleportTransfer,
  getUpdatedRetryableDeposit,
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
import { isValidTeleportChainPair } from '@/token-bridge-sdk/teleport'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { Address } from '../util/AddressUtils'
import {
  TeleportFromSubgraph,
  fetchTeleports
} from '../util/teleports/fetchTeleports'
import {
  isTransferTeleportFromSubgraph,
  transformTeleportFromSubgraph
} from '../util/teleports/helpers'
import { captureSentryErrorWithExtraData } from '../util/SentryUtils'
import { useArbQueryParams } from './useArbQueryParams'

type UsePartialTransactionHistoryResult = {
  transactions: MergedTransaction[]
  loading: boolean
  completed: boolean
  error: unknown
  failedChainPairs: ChainPair[]
  resume: () => void
  updatePendingTransaction: (tx: MergedTransaction) => Promise<void>
  stepName: string | undefined
}

export type ChainPair = { parentChainId: ChainId; childChainId: ChainId }

export type Deposit = Transaction

export type Withdrawal =
  | FetchWithdrawalsFromSubgraphResult
  | WithdrawalInitiated
  | EthWithdrawal

type DepositOrWithdrawal = Deposit | Withdrawal
export type Transfer =
  | DepositOrWithdrawal
  | MergedTransaction
  | TeleportFromSubgraph

function getTransactionTimestamp(tx: Transfer) {
  if (isCctpTransfer(tx)) {
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

export function getMultiChainFetchList({
  core = true,
  orbit = true
}: {
  core?: boolean
  orbit?: boolean
} = {}): ChainPair[] {
  return getChains().flatMap(chain => {
    // We only grab child chains because we don't want duplicates and we need the parent chain
    // Although the type is correct here we default to an empty array for custom networks backwards compatibility
    const childChainIds = getChildChainIds(chain)

    const filteredChildChainIds = childChainIds.filter(chainId => {
      const isOrbitChain = isNetwork(chainId).isOrbitChain
      if (core && !isOrbitChain) {
        return true
      }
      if (orbit && isOrbitChain) {
        return true
      }
      return false
    })

    const isParentChain = filteredChildChainIds.length > 0

    if (!isParentChain) {
      // Skip non-parent chains
      return []
    }

    // For each destination chain, map to an array of ChainPair objects
    return filteredChildChainIds.map(childChainId => ({
      parentChainId: chain.chainId,
      childChainId: childChainId
    }))
  })
}

function isWithdrawalFromSubgraph(
  tx: Withdrawal
): tx is FetchWithdrawalsFromSubgraphResult {
  return tx.source === 'subgraph'
}

function isDeposit(tx: DepositOrWithdrawal): tx is Deposit {
  return tx.direction === 'deposit'
}

async function transformTransaction(tx: Transfer): Promise<MergedTransaction> {
  // teleport-from-subgraph doesn't have a child-chain-id, we detect it later, hence, an early return
  if (isTransferTeleportFromSubgraph(tx)) {
    return await transformTeleportFromSubgraph(tx)
  }

  const parentProvider = getProviderForChainId(tx.parentChainId)
  const childProvider = getProviderForChainId(tx.childChainId)

  if (isCctpTransfer(tx)) {
    return tx
  }

  if (isDeposit(tx)) {
    return transformDeposit(await updateAdditionalDepositData(tx))
  }

  let withdrawal: L2ToL1EventResultPlus | undefined

  if (isWithdrawalFromSubgraph(tx)) {
    withdrawal = await mapWithdrawalToL2ToL1EventResult({
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
  return tx.l2TxHash ?? tx.transactionHash
}

function getCacheKeyFromTransaction(
  tx: Transaction | MergedTransaction | TeleportFromSubgraph | Withdrawal
) {
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

/**
 * Fetches transaction history only for deposits and withdrawals, without their statuses.
 */
const useTransactionHistoryWithoutStatuses = (
  address: Address | undefined,
  { forChains, ready }: { forChains: ChainPair[]; ready: boolean }
) => {
  const { chain } = useNetwork()
  const [isTestnetMode] = useIsTestnetMode()
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()
  const [{ txHistory: isTxHistoryEnabled }] = useArbQueryParams()

  // Check what type of CCTP (deposit, withdrawal or all) to fetch
  // We need this because of Smart Contract Wallets
  const cctpTypeToFetch = useCallback(
    (chainPair: ChainPair): 'deposits' | 'withdrawals' | 'all' | undefined => {
      if (
        typeof forChains.find(
          c =>
            c.parentChainId === chainPair.parentChainId &&
            c.childChainId === chainPair.childChainId
        ) === 'undefined'
      ) {
        return undefined
      }
      if (isLoadingAccountType || !chain || !isTxHistoryEnabled || !ready) {
        return undefined
      }
      if (isSmartContractWallet) {
        // fetch based on the connected network
        if (chain.id === chainPair.parentChainId) {
          return 'deposits'
        }
        if (chain.id === chainPair.childChainId) {
          return 'withdrawals'
        }
        return undefined
      }
      // EOA
      return isNetwork(chainPair.parentChainId).isTestnet === isTestnetMode
        ? 'all'
        : undefined
    },
    [
      isSmartContractWallet,
      isTxHistoryEnabled,
      isLoadingAccountType,
      chain,
      isTestnetMode
    ]
  )

  const cctpTransfersMainnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Ethereum,
    l2ChainId: ChainId.ArbitrumOne,
    pageNumber: 0,
    pageSize: cctpTypeToFetch({
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne
    })
      ? 1000
      : 0,
    type:
      cctpTypeToFetch({
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.ArbitrumOne
      }) ?? 'all'
  })

  const cctpTransfersTestnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Sepolia,
    l2ChainId: ChainId.ArbitrumSepolia,
    pageNumber: 0,
    pageSize: cctpTypeToFetch({
      parentChainId: ChainId.Sepolia,
      childChainId: ChainId.ArbitrumSepolia
    })
      ? 1000
      : 0,
    type:
      cctpTypeToFetch({
        parentChainId: ChainId.Sepolia,
        childChainId: ChainId.ArbitrumSepolia
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
        forChains
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

              // else, fetch deposits or withdrawals
              return await fetcherFn({
                sender: includeSentTxs ? address : undefined,
                receiver: includeReceivedTxs ? address : undefined,
                l1Provider: getProviderForChainId(chainPair.parentChainId),
                l2Provider: getProviderForChainId(chainPair.childChainId),
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
    [address, isTestnetMode, addFailedChainPair, isSmartContractWallet, chain]
  )

  const shouldFetch =
    ready && address && chain && !isLoadingAccountType && isTxHistoryEnabled

  const {
    data: depositsData,
    error: depositsError,
    isLoading: depositsLoading
  } = useSWRImmutable(
    shouldFetch
      ? [
          'tx_list',
          'deposits',
          address,
          isTestnetMode,
          JSON.stringify(forChains)
        ]
      : null,
    () => fetcher('deposits')
  )

  const {
    data: withdrawalsData,
    error: withdrawalsError,
    isLoading: withdrawalsLoading
  } = useSWRImmutable(
    shouldFetch
      ? [
          'tx_list',
          'withdrawals',
          address,
          isTestnetMode,
          JSON.stringify(forChains)
        ]
      : null,
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

type UsePartialTransactionHistoryProps = {
  address: Address | undefined
  // TODO: look for a solution to this. It's used for now so that useEffect that handles pagination runs only a single instance.
  runFetcher?: boolean
  stepName: string
  fetchFor?: {
    chains?: ChainPair[]
  }
  ready?: boolean
}

function isReady({
  previousStep
}: {
  previousStep: UsePartialTransactionHistoryResult
}) {
  if (previousStep.completed) {
    return true
  }
  return previousStep.transactions.length > 0 && !previousStep.loading
}

/**
 * Maps additional info to previously fetches transaction history, starting with the earliest data.
 * This is done in small batches to safely meet RPC limits.
 */
const usePartialTransactionHistory = (
  props: UsePartialTransactionHistoryProps
): UsePartialTransactionHistoryResult => {
  const ready = typeof props.ready === 'undefined' ? true : props.ready
  const forChains = props.fetchFor?.chains || getMultiChainFetchList()
  const { address, runFetcher } = props

  const [isTestnetMode] = useIsTestnetMode()
  const { chain } = useNetwork()
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()
  const [{ txHistory: isTxHistoryEnabled }] = useArbQueryParams()
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
  } = useTransactionHistoryWithoutStatuses(address, { forChains, ready })

  const getCacheKey = useCallback(
    (pageNumber: number, prevPageTxs: MergedTransaction[]) => {
      if (prevPageTxs) {
        if (prevPageTxs.length === 0) {
          // THIS is the last page
          return null
        }
      }

      return ready &&
        address &&
        !isLoadingTxsWithoutStatus &&
        !isLoadingAccountType
        ? (['complete_tx_list', address, pageNumber, data] as const)
        : null
    },
    [ready, address, isLoadingTxsWithoutStatus, data, isLoadingAccountType]
  )

  const depositsFromCache = useMemo(() => {
    if (isLoadingAccountType || !chain || !isTxHistoryEnabled) {
      return []
    }
    return getDepositsWithoutStatusesFromCache(address)
      .filter(tx => isNetwork(tx.parentChainId).isTestnet === isTestnetMode)
      .filter(tx => {
        const chainPairExists = forChains.some(chainPair => {
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
      const dedupedTransactions = dedupeTransactions(dataWithCache).sort(
        sortByTimestampDescending
      )

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

  const transactions: MergedTransaction[] = useMemo(() => {
    const txs = (txPages || []).flat()
    // make sure txs are for the current account, we can have a mismatch when switching accounts for a bit
    return txs.filter(tx =>
      [tx.sender?.toLowerCase(), tx.destination?.toLowerCase()].includes(
        address?.toLowerCase()
      )
    )
  }, [txPages, address])

  const updateCachedTransaction = useCallback(
    (newTx: MergedTransaction) => {
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
    [mutateTxPages]
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

      const isDifferentDestinationAddress = isCustomDestinationAddressTx(tx)

      // ETH deposit to the same address
      if (tx.assetType === AssetType.ETH && !isDifferentDestinationAddress) {
        const updatedEthDeposit = await getUpdatedEthDeposit(tx)
        updateCachedTransaction(updatedEthDeposit)
        return
      }

      // Token deposit or ETH deposit to a different destination address
      const updatedRetryableDeposit = await getUpdatedRetryableDeposit(tx)
      updateCachedTransaction(updatedRetryableDeposit)
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
      transactions: [],
      loading: isLoadingTxsWithoutStatus,
      error,
      failedChainPairs: [],
      completed: !isLoadingTxsWithoutStatus,
      resume,
      updatePendingTransaction,
      stepName: props.stepName
    }
  }

  return {
    transactions,
    loading: isLoadingFirstPage || isLoadingMore,
    completed,
    error: txPagesError ?? error,
    failedChainPairs,
    resume,
    updatePendingTransaction,
    stepName: props.stepName
  }
}

const useCurrentSessionTransactions = (address: Address | undefined) => {
  const { data: currentSessionTransactions, mutate } = useSWRImmutable<
    MergedTransaction[]
  >(address ? [address, 'current_session_transactions'] : null)

  const addPendingTransaction = useCallback(
    (tx: MergedTransaction) => {
      if (!isTxPending(tx)) {
        return
      }

      mutate(transactions => {
        if (!transactions) {
          return [tx]
        }

        return [tx, ...transactions]
      })
    },
    [mutate]
  )

  return {
    currentSessionTransactions: currentSessionTransactions || [],
    addPendingTransaction
  }
}

type UseTransactionHistoryProps = Omit<
  UsePartialTransactionHistoryProps,
  'forChains' | 'ready' | 'stepName'
>

export type UseTransactionHistoryResult = UsePartialTransactionHistoryResult & {
  addPendingTransaction: (tx: MergedTransaction) => void
  stepsLoadingStates: boolean[]
}

export const useTransactionHistory = (
  props: UseTransactionHistoryProps
): UseTransactionHistoryResult => {
  const { currentSessionTransactions, addPendingTransaction } =
    useCurrentSessionTransactions(props.address)

  const step1 = usePartialTransactionHistory({
    ...props,
    fetchFor: {
      chains: getMultiChainFetchList({ core: true, orbit: false })
    },
    stepName: 'Core Chains',
    ready: true
  })

  const step2 = usePartialTransactionHistory({
    ...props,
    fetchFor: {
      chains: getMultiChainFetchList({ core: false, orbit: true })
    },
    stepName: 'Orbit Chains',
    ready: isReady({ previousStep: step1 })
  })

  // To add new step:
  // 1. const step{X} = usePartialTransactionHistory({ ..., ready: isReady({ previousStep: step{X - 1} }) })
  // 2. stepResults = [..., step{X}]

  const stepResults = [step1, step2]

  const completed = useMemo(() => {
    return stepResults.every(r => r.completed)
  }, [stepResults])

  const loading = useMemo(() => {
    return stepResults.some(r => r.loading)
  }, [stepResults])

  const error = useMemo(() => {
    return stepResults.filter(r => typeof r.error !== 'undefined')[0]?.error
  }, [stepResults])

  const failedChainPairs = useMemo(() => {
    return [...new Set([...stepResults.map(r => r.failedChainPairs)].flat())]
  }, [stepResults])

  const stepsLoadingStates = useMemo(() => {
    return stepResults.map(r => r.loading)
  }, [stepResults])

  const updatePendingTransaction = useCallback(
    async (tx: MergedTransaction) =>
      stepResults.forEach(r => r.updatePendingTransaction(tx)),
    [stepResults]
  )

  const resume = useCallback(
    () => stepResults.forEach(r => r.resume()),
    [stepResults]
  )

  const transactions = useMemo(() => {
    return Array.from(
      new Map(
        [
          ...currentSessionTransactions,
          ...stepResults.map(r => r.transactions).flat()
        ].map(tx => [`${tx.parentChainId}-${tx.txId.toLowerCase()}`, tx])
      ).values()
    )
  }, [stepResults])

  const latestStep = useMemo(() => {
    return (
      stepResults.filter(r => !r.completed)[0] ||
      // if everything is fetched, get the last step
      stepResults[stepResults.length - 1]!
    )
  }, [stepResults])

  return {
    ...latestStep,
    transactions,
    completed,
    loading,
    stepsLoadingStates,
    error,
    failedChainPairs,
    addPendingTransaction,
    updatePendingTransaction,
    resume
  }
}
