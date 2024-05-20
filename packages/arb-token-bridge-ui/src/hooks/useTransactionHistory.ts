import { useAccount, useNetwork } from 'wagmi'
import useSWRImmutable from 'swr/immutable'
import useSWRInfinite from 'swr/infinite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { utils } from 'ethers'

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
  getUpdatedTeleportTransfer,
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
import {
  getL3ChainIdFromTeleportEvents,
  isTeleport
} from '@/token-bridge-sdk/teleport'
import { Address } from '../util/AddressUtils'
import {
  TeleportFromSubgraph,
  fetchTeleports
} from '../util/teleports/fetchTeleports'
import { FetchEthTeleportsFromSubgraphResult } from '../util/teleports/fetchEthTeleportsFromSubgraph'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { fetchErc20Data } from '../util/TokenUtils'

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
  | FetchWithdrawalsFromSubgraphResult
  | WithdrawalInitiated
  | EthWithdrawal

type DepositOrWithdrawal = Deposit | Withdrawal
export type Transfer =
  | DepositOrWithdrawal
  | MergedTransaction
  | TeleportFromSubgraph

function getStandardizedTimestampByTx(tx: Transfer) {
  if (isCctpTransfer(tx)) {
    return (tx.createdAt ?? 0) / 1_000
  }

  if (isTransferTeleportFromSubgraph(tx)) {
    return tx.timestamp
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

export function getMultiChainFetchList(): ChainPair[] {
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
      parentChainId: chain.chainID,
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
  if (isTransferTeleportFromSubgraph(tx)) {
    return await transformTeleportTransaction(tx)
  }

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

function isTransferTeleportFromSubgraph(
  tx: Transfer
): tx is TeleportFromSubgraph {
  // @ts-ignore : for now just ignore this xxxx
  return typeof tx.teleport_type !== 'undefined'
}

async function transformTeleportTransaction(
  tx: TeleportFromSubgraph
): Promise<MergedTransaction> {
  const parentChainProvider = getProviderForChainId(Number(tx.l1ChainId))
  const transactionDetails = await parentChainProvider.getTransaction(
    tx.transactionHash
  )

  // Eth transfers
  if (isTransactionEthTeleportFromSubgraph(tx)) {
    const depositTx = {
      type: 'deposit-l1',
      status: 'pending',
      direction: 'deposit',
      source: 'subgraph',
      value: utils.formatUnits(transactionDetails.value || 0, 18),
      txID: tx.transactionHash,
      tokenAddress: '',
      sender: tx.sender,
      destination: tx.sender,
      assetName: 'ETH',
      assetType: AssetType.ETH,
      l1NetworkID: tx.l1ChainId,
      l2NetworkID: tx.l3ChainId,
      blockNumber: Number(tx.blockCreatedAt),
      timestampCreated: tx.timestamp,
      isClassic: false,
      parentChainId: Number(tx.l1ChainId),
      childChainId: Number(tx.l3ChainId)
    } as Transaction

    const childChainProvider = getProviderForChainId(Number(tx.l3ChainId))
    return transformDeposit(
      await updateAdditionalDepositData({
        depositTx,
        l1Provider: parentChainProvider,
        l2Provider: childChainProvider
      })
    )
  }

  // Erc20 transfers
  const l1TokenAddress = tx.l1Token
  const { symbol, decimals } = await fetchErc20Data({
    address: l1TokenAddress,
    provider: parentChainProvider
  })
  const l3ChainId = await getL3ChainIdFromTeleportEvents(
    tx,
    parentChainProvider
  )
  const depositTx = {
    type: 'deposit-l1',
    status: 'pending',
    direction: 'deposit',
    source: 'subgraph',
    value: utils.formatUnits(tx.amount || 0, decimals),
    txID: tx.transactionHash,
    tokenAddress: l1TokenAddress,
    sender: tx.sender,
    destination: tx.sender,
    assetName: symbol,
    assetType: AssetType.ERC20,
    l1NetworkID: tx.l1ChainId,
    l2NetworkID: String(l3ChainId),
    blockNumber: Number(transactionDetails.blockNumber),
    timestampCreated: tx.timestamp,
    isClassic: false,
    parentChainId: Number(tx.l1ChainId),
    childChainId: l3ChainId
  } as Transaction

  const childChainProvider = getProviderForChainId(l3ChainId)
  return transformDeposit(
    await updateAdditionalDepositData({
      depositTx,
      l1Provider: parentChainProvider,
      l2Provider: childChainProvider
    })
  )
}

function isTransactionEthTeleportFromSubgraph(
  tx: TeleportFromSubgraph
): tx is FetchEthTeleportsFromSubgraphResult {
  return tx.teleport_type === 'eth'
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
  if (isTransferTeleportFromSubgraph(tx)) {
    return `${tx.l1ChainId}-${getTxIdFromTransaction(tx)?.toLowerCase()}`
  }

  return `${tx.parentChainId}-${tx.childChainId}-${getTxIdFromTransaction(
    tx
  )?.toLowerCase()}}`
}

function dedupeTransactions(txns: Transfer[]) {
  const txnCacheMap = new Map<string, Transfer>()

  txns.forEach(tx => {
    // special check for teleport txn
    // if we detect that a teleport tx from subgraph has already been added to the map, then discard the same teleport tx that has been added through local storage
    // we do this check manually because teleport-tx-from-subgraph will have different cache-key compared to teleport-tx-from-local-storage
    // ... ^ this is because teleport-tx-from-subgraph doesn't have a child-chain-id (which is a part of cache key), we detect it later in the `transformTeleport` function
    if (
      !isTransferTeleportFromSubgraph(tx) && // tx is not teleport from subgraph...
      isTeleport({
        // ...but tx is teleport
        sourceChainId: tx.parentChainId,
        destinationChainId: tx.childChainId
      }) &&
      txnCacheMap.has(
        // ...and has the same cache key as teleport-tx-from-subgraph cache key
        `${tx.parentChainId}-${getTxIdFromTransaction(tx)?.toLowerCase()}`
      )
    ) {
      // ...discard the tx
      console.log(
        "Discarding teleport tx from local storage because it's already in the cache",
        tx
      )
      return
    }

    // else, add the tx to the cache
    const cacheKey = getCacheKeyFromTransaction(tx)
    txnCacheMap.set(cacheKey, tx)
  })
  return Array.from(new Map(txnCacheMap).values())
}

/**
 * Fetches transaction history only for deposits and withdrawals, without their statuses.
 */
const useTransactionHistoryWithoutStatuses = (address: Address | undefined) => {
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

  const { data: failedChainPairs, mutate: addFailedChainPair } =
    useSWRImmutable<ChainPair[]>(
      address ? ['failed_chain_pairs', address] : null
    )

  const fetcher = useCallback(
    (type: 'deposits' | 'withdrawals' | 'teleports') => {
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
              type, // xxx what if it's a teleport type?
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
                type === 'teleports' &&
                isTeleport({
                  sourceChainId: chainPair.parentChainId,
                  destinationChainId: chainPair.childChainId
                })
              ) {
                return await fetchTeleports({
                  sender: includeSentTxs ? address : undefined,
                  receiver: includeReceivedTxs ? address : undefined,
                  parentChainProvider: getProvider(chainPair.parentChainId),
                  childChainProvider: getProvider(chainPair.childChainId),
                  pageNumber: 0,
                  pageSize: 1000
                })
              }

              // else, fetch deposits or withdrawals
              return await fetcherFn({
                sender: includeSentTxs ? address : undefined,
                receiver: includeReceivedTxs ? address : undefined,
                l1Provider: getProvider(chainPair.parentChainId),
                l2Provider: getProvider(chainPair.childChainId),
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

  const {
    data: teleportsData,
    error: teleportsError,
    isLoading: teleportsLoading
  } = useSWRImmutable(
    shouldFetch ? ['tx_list', 'teleports', address, isTestnetMode] : null,
    () => fetcher('teleports')
  )

  const deposits = (depositsData || []).flat()

  const withdrawals = (withdrawalsData || []).flat()

  const teleports = (teleportsData || []).flat()

  // merge deposits and withdrawals and sort them by date
  const transactions = [
    ...deposits,
    ...withdrawals,
    ...teleports,
    ...combinedCctpTransfers
  ].flat()

  return {
    data: transactions,
    loading:
      depositsLoading || withdrawalsLoading || cctpLoading || teleportsLoading,
    error: depositsError ?? withdrawalsError ?? teleportsError,
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
  const { chain } = useNetwork()
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()
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

      if (isTeleport(tx)) {
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
