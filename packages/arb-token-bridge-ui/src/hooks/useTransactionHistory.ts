import { useAccount, useNetwork } from 'wagmi'
import useSWRImmutable from 'swr/immutable'
import useSWRInfinite from 'swr/infinite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import {
  ChainId,
  getChains,
  getChildChainIds,
  isNetwork
} from '../util/networks'
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

export type UseTransactionHistoryResult = {
  transactions: MergedTransaction[]
  senderData: {
    senderTransactions: MergedTransaction[]
    loadingForSender: boolean
    completedForSender: boolean
    errorForSender: unknown
  }
  receiverData: {
    receiverTransactions: MergedTransaction[]
    loadingForReceiver: boolean
    completedForReceiver: boolean
    errorForReceiver: unknown
  }
  rawDataErroredChains: ChainPair[]
  pause: () => void
  resume: () => void
  addPendingTransaction: (tx: MergedTransaction) => void
  updatePendingTransaction: (tx: MergedTransaction) => Promise<void>
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
    return transformDeposit(
      await updateAdditionalDepositData({
        depositTx: tx,
        parentProvider,
        childProvider
      })
    )
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
const useRawTransactionHistory = ({
  address,
  fetchFor,
  fetchStarted
}: {
  address: Address | undefined
  fetchFor: 'sender' | 'receiver'
  fetchStarted: boolean
}) => {
  const { chain } = useNetwork()
  const [isTestnetMode] = useIsTestnetMode()
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  const { data: erroredChains, mutate: addErroredChain } = useSWRImmutable<
    ChainPair[]
  >(address ? ['errored_chains', address] : null)

  const fetcher = useCallback(
    ({
      type,
      fetchFor
    }: {
      type: 'deposits' | 'withdrawals'
      fetchFor: 'sender' | 'receiver'
    }) => {
      if (!chain) {
        return []
      }

      const fetcherFn = type === 'deposits' ? fetchDeposits : fetchWithdrawals

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

            const fetchForSender = fetchFor === 'sender' && includeSentTxs
            const fetchForReceiver =
              fetchFor === 'receiver' && includeReceivedTxs

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
                  sender: fetchForSender ? address : undefined,
                  receiver: fetchForReceiver ? address : undefined,
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
                sender: fetchForSender ? address : undefined,
                receiver: fetchForReceiver ? address : undefined,
                l1Provider: getProviderForChainId(chainPair.parentChainId),
                l2Provider: getProviderForChainId(chainPair.childChainId),
                pageNumber: 0,
                pageSize: 1000
              })
            } catch {
              addErroredChain(prevErroredChains => {
                if (!prevErroredChains) {
                  return [chainPair]
                }
                if (
                  typeof prevErroredChains.find(
                    prev =>
                      prev.parentChainId === chainPair.parentChainId &&
                      prev.childChainId === chainPair.childChainId
                  ) !== 'undefined'
                ) {
                  // already added
                  return prevErroredChains
                }

                return [...prevErroredChains, chainPair]
              })

              return []
            }
          })
      )
    },
    [addErroredChain, address, chain, isSmartContractWallet, isTestnetMode]
  )

  const shouldFetch = fetchStarted && address && chain && !isLoadingAccountType

  const {
    data: depositsData,
    error: depositsError,
    isLoading: depositsLoading
  } = useSWRImmutable(
    shouldFetch
      ? ['tx_list', 'deposits', address, isTestnetMode, fetchFor]
      : null,
    () => fetcher({ type: 'deposits', fetchFor })
  )

  const {
    data: withdrawalsData,
    error: withdrawalsError,
    isLoading: withdrawalsLoading
  } = useSWRImmutable(
    shouldFetch
      ? ['tx_list', 'withdrawals', address, isTestnetMode, fetchFor]
      : null,
    () => fetcher({ type: 'withdrawals', fetchFor })
  )

  const deposits = (depositsData || []).flat()

  const withdrawals = (withdrawalsData || []).flat()

  // merge deposits and withdrawals and sort them by date
  const transactions = [
    ...deposits,
    ...withdrawals
    // ...combinedCctpTransfers
  ].flat()

  return {
    rawData: transactions,
    rawDataLoading: depositsLoading || withdrawalsLoading,
    // loading: depositsLoading || withdrawalsLoading || cctpLoading,
    rawDataError: depositsError ?? withdrawalsError,
    rawDataErroredChains: erroredChains || []
  }
}

const useCctpTransactions = ({ address }: { address: Address | undefined }) => {
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
    [isSmartContractWallet, isLoadingAccountType, chain, isTestnetMode]
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

  return { cctpTransactions: combinedCctpTransfers, cctpLoading }
}

/**
 * Maps additional info to previously fetches transaction history, starting with the earliest data.
 * This is done in small batches to safely meet RPC limits.
 */
const useMappedTransactionHistory = ({
  address,
  fetchFor,
  fetchStarted,
  runFetcher = false
}: {
  address: Address | undefined
  fetchFor: 'sender' | 'receiver'
  fetchStarted: boolean
  runFetcher?: boolean
}) => {
  // max number of transactions mapped in parallel
  const MAX_BATCH_SIZE = 3
  // Pause fetching after specified number of days. User can resume fetching to get another batch.
  const PAUSE_SIZE_DAYS = 30

  const { chain } = useNetwork()
  const [isTestnetMode] = useIsTestnetMode()
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()
  const { connector } = useAccount()

  const [fetching, setFetching] = useState(true)
  const [pauseCount, setPauseCount] = useState(0)

  const { rawData, rawDataLoading, rawDataError, rawDataErroredChains } =
    useRawTransactionHistory({
      address,
      fetchFor,
      fetchStarted
    })

  function pause() {
    setFetching(false)
  }

  function resume() {
    setFetching(true)
    setPage(prevPage => prevPage + 1)
  }

  const getSwrCacheKeyForSender = useCallback(
    (pageNumber: number, prevPageTxs: MergedTransaction[]) => {
      if (fetchFor !== 'sender') {
        return null
      }

      if (!fetchStarted) {
        return null
      }

      if (prevPageTxs) {
        if (prevPageTxs.length === 0) {
          // THIS is the last page
          return null
        }
      }

      return address && !rawDataLoading && !isLoadingAccountType
        ? ([
            'mapped_transaction_history_for_sender',
            address,
            pageNumber,
            rawData
          ] as const)
        : null
    },
    [
      fetchFor,
      fetchStarted,
      address,
      rawDataLoading,
      isLoadingAccountType,
      rawData
    ]
  )

  const getSwrCacheKeyForReceiver = useCallback(() => {
    if (fetchFor !== 'receiver') {
      return null
    }

    if (!fetchStarted) {
      return null
    }

    return address && !rawDataLoading && !isLoadingAccountType
      ? (['mapped_transaction_history_for_receiver', address, rawData] as const)
      : null
  }, [
    address,
    fetchFor,
    fetchStarted,
    isLoadingAccountType,
    rawData,
    rawDataLoading
  ])

  const depositsFromCache = useMemo(() => {
    if (isLoadingAccountType || !chain) {
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
    chain
  ])

  const {
    data: senderTxPages,
    error: senderTxPagesError,
    size: page,
    setSize: setPage,
    mutate: mutateSenderTxPages,
    isValidating: isValidatingSenderTxPages,
    isLoading: isLoadingSenderFirstPage
  } = useSWRInfinite(
    getSwrCacheKeyForSender,
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

  const {
    data: receiverTransactions,
    error: receiverTransactionsError,
    isLoading: isLoadingReceiverTransactions
  } = useSWRImmutable(
    getSwrCacheKeyForReceiver,
    async ([, _address, _data]) => {
      const _receiverTransactions = _data.filter(tx => {
        if (isTransferTeleportFromSubgraph(tx)) {
          return tx.sender.toLowerCase() !== _address?.toLowerCase()
        }

        if (isDeposit(tx)) {
          return (
            tx.destination &&
            tx.sender.toLowerCase() !== tx.destination.toLowerCase()
          )
        }

        if (isWithdrawalFromSubgraph(tx)) {
          return tx.sender.toLowerCase() !== tx.receiver.toLowerCase()
        }

        if (isTokenWithdrawal(tx)) {
          return tx._from.toLowerCase() !== tx._to.toLowerCase()
        }

        return tx.caller.toLowerCase() !== tx.destination.toLowerCase()
      })

      const results = []
      for (const tx of _receiverTransactions) {
        const transformedTx = await transformTransaction(tx)
        results.push(transformedTx)
      }
      return results
    }
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
    if (typeof rawDataError !== 'undefined') {
      console.warn(rawDataError)
      captureSentryErrorWithExtraData({
        error: rawDataError,
        originFunction: 'useRawTransactionHistory'
      })
    }

    if (typeof senderTxPagesError !== 'undefined') {
      console.warn(senderTxPagesError)
      captureSentryErrorWithExtraData({
        error: senderTxPagesError,
        originFunction: 'useMappedTransactionHistory'
      })
    }
  }, [rawDataError, senderTxPagesError])

  // transfers initiated by the user during the current session
  // we store it separately as there are a lot of side effects when mutating SWRInfinite
  const { data: newTransactionsData, mutate: mutateNewTransactionsData } =
    useSWRImmutable<MergedTransaction[]>(
      address ? ['new_tx_list', address] : null
    )

  const senderTransactionsWithNewTransactions: MergedTransaction[] =
    useMemo(() => {
      const txs = [
        ...(newTransactionsData || []),
        ...(senderTxPages || [])
      ].flat()
      // make sure txs are for the current account, we can have a mismatch when switching accounts for a bit
      return txs.filter(tx =>
        [tx.sender?.toLowerCase(), tx.destination?.toLowerCase()].includes(
          address?.toLowerCase()
        )
      )
    }, [newTransactionsData, senderTxPages, address])

  const updateTransactionInSwrCache = useCallback(
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
      mutateSenderTxPages(prevTxPages => {
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
    [mutateNewTransactionsData, mutateSenderTxPages, newTransactionsData]
  )

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

  const updatePendingTransaction = useCallback(
    async (tx: MergedTransaction) => {
      if (!isTxPending(tx)) {
        // if not pending we don't need to check for status, we accept whatever status is passed in
        updateTransactionInSwrCache(tx)
        return
      }

      if (isTeleportTx(tx)) {
        const updatedTeleportTransfer = await getUpdatedTeleportTransfer(tx)
        updateTransactionInSwrCache(updatedTeleportTransfer)
        return
      }

      if (tx.isCctp) {
        const updatedCctpTransfer = await getUpdatedCctpTransfer(tx)
        updateTransactionInSwrCache(updatedCctpTransfer)
        return
      }

      // ETH or token withdrawal
      if (tx.isWithdrawal) {
        const updatedWithdrawal = await getUpdatedWithdrawal(tx)
        updateTransactionInSwrCache(updatedWithdrawal)
        return
      }

      const isDifferentDestinationAddress = isCustomDestinationAddressTx(tx)

      // ETH deposit to the same address
      if (tx.assetType === AssetType.ETH && !isDifferentDestinationAddress) {
        const updatedEthDeposit = await getUpdatedEthDeposit(tx)
        updateTransactionInSwrCache(updatedEthDeposit)
        return
      }

      // Token deposit or ETH deposit to a different destination address
      const updatedRetryableDeposit = await getUpdatedRetryableDeposit(tx)
      updateTransactionInSwrCache(updatedRetryableDeposit)
    },
    [updateTransactionInSwrCache]
  )

  // based on an example from SWR
  // https://swr.vercel.app/examples/infinite-loading
  const isLoadingMore =
    page > 0 &&
    typeof senderTxPages !== 'undefined' &&
    typeof senderTxPages[page - 1] === 'undefined'

  const senderCompleted =
    !isLoadingSenderFirstPage &&
    typeof senderTxPages !== 'undefined' &&
    rawData.length === senderTxPages.flat().length

  useEffect(() => {
    if (
      !senderTxPages ||
      !fetching ||
      !runFetcher ||
      isValidatingSenderTxPages
    ) {
      return
    }

    const firstPage = senderTxPages[0]
    const lastPage = senderTxPages[senderTxPages.length - 1]

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
    if (page === senderTxPages.length) {
      setPage(prevPage => prevPage + 1)
    }
  }, [
    senderTxPages,
    setPage,
    page,
    pauseCount,
    fetching,
    runFetcher,
    isValidatingSenderTxPages
  ])

  return {
    transactions:
      fetchFor === 'sender'
        ? senderTransactionsWithNewTransactions || []
        : receiverTransactions || [],
    error: senderTxPagesError || receiverTransactionsError,
    completed:
      senderCompleted ||
      (fetchFor === 'receiver' && !isLoadingReceiverTransactions),
    loading:
      rawDataLoading ||
      isLoadingSenderFirstPage ||
      isLoadingMore ||
      isLoadingReceiverTransactions,
    rawDataErroredChains,
    pause,
    resume,
    addPendingTransaction,
    updatePendingTransaction
  }
}

export const useTransactionHistory = (
  address: Address | undefined,
  // TODO: look for a solution to this. It's used for now so that useEffect that handles pagination runs only a single instance.
  { runFetcher = false } = {}
): UseTransactionHistoryResult => {
  const {
    transactions: senderTransactions,
    loading: loadingForSender,
    completed: completedForSender,
    error: errorForSender,
    rawDataErroredChains: rawDataErroredChainsForSender,
    pause,
    resume,
    addPendingTransaction,
    updatePendingTransaction
  } = useMappedTransactionHistory({
    address,
    fetchFor: 'sender',
    fetchStarted: true,
    runFetcher
  })

  const {
    transactions: receiverTransactions,
    loading: loadingForReceiver,
    completed: completedForReceiver,
    error: errorForReceiver,
    rawDataErroredChains: rawDataErroredChainsForReceiver
  } = useMappedTransactionHistory({
    address,
    fetchFor: 'receiver',
    fetchStarted: !loadingForSender,
    runFetcher
  })

  const { cctpTransactions, cctpLoading } = useCctpTransactions({ address })

  return {
    transactions: [
      ...senderTransactions,
      ...receiverTransactions,
      ...cctpTransactions
    ].sort(sortByTimestampDescending),
    senderData: {
      senderTransactions,
      loadingForSender: loadingForSender || cctpLoading,
      completedForSender,
      errorForSender
    },
    receiverData: {
      receiverTransactions,
      loadingForReceiver,
      completedForReceiver,
      errorForReceiver
    },
    rawDataErroredChains:
      rawDataErroredChainsForSender || rawDataErroredChainsForReceiver,
    pause,
    resume,
    addPendingTransaction,
    updatePendingTransaction
  }
}
