import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { ChainId, rpcURLs } from '../util/networks'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { getWagmiChain } from '../util/wagmi/getWagmiChain'
import { useCallback, useEffect, useState } from 'react'
import { fetchWithdrawalList } from '../util/withdrawals/fetchWithdrawalsList'
import { fetchDepositList } from '../util/deposits/fetchDepositList'
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

export type AdditionalTransferProperties = {
  direction: 'deposit' | 'withdrawal'
  source: 'subgraph' | 'event_logs'
  parentChainId: ChainId
  chainId: ChainId
}

export type Deposit = Transaction

export type Withdrawal = (
  | FetchWithdrawalsFromSubgraphResult
  | WithdrawalInitiated
  | EthWithdrawal
) &
  AdditionalTransferProperties

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
    return getStandardizedTimestamp(tx.timestamp)
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
    parentChain: ChainId.Mainnet,
    chain: ChainId.ArbitrumOne
  },
  {
    parentChain: ChainId.Mainnet,
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
): tx is FetchWithdrawalsFromSubgraphResult & AdditionalTransferProperties {
  return tx.source === 'subgraph'
}

function isCctpTransfer(
  tx: DepositOrWithdrawal | MergedTransaction
): tx is MergedTransaction {
  return !!(tx as MergedTransaction).isCctp
}

function isDeposit(tx: DepositOrWithdrawal): tx is Deposit {
  return tx.direction === 'deposit'
}

async function transformTransaction(tx: DepositOrWithdrawal) {
  const parentChainProvider = getProvider(tx.parentChainId)
  const chainProvider = getProvider(tx.chainId)

  if (isDeposit(tx)) {
    return transformDeposit(
      await updateAdditionalDepositData({
        depositTx: tx,
        l1Provider: parentChainProvider,
        l2Provider: chainProvider
      })
    )
  }

  let withdrawal: L2ToL1EventResultPlus | undefined

  if (isWithdrawalFromSubgraph(tx)) {
    withdrawal = await mapWithdrawalToL2ToL1EventResult({
      withdrawal: tx,
      l1Provider: parentChainProvider,
      l2Provider: chainProvider
    })
  } else {
    if (isTokenWithdrawal(tx)) {
      withdrawal = await mapTokenWithdrawalFromEventLogsToL2ToL1EventResult({
        result: tx,
        l1Provider: parentChainProvider,
        l2Provider: chainProvider
      })
    } else {
      withdrawal = await mapETHWithdrawalToL2ToL1EventResult({
        event: tx,
        l1Provider: parentChainProvider,
        l2Provider: chainProvider
      })
    }
  }

  if (withdrawal) {
    return transformWithdrawal(withdrawal)
  }
}

function getProvider(chainId: ChainId) {
  const rpcUrl =
    rpcURLs[chainId] ?? getWagmiChain(chainId).rpcUrls.default.http[0]
  return new StaticJsonRpcProvider(rpcUrl)
}

/**
 * Fetches transaction history only, and only for a specific direction.
 * The query could be e.g. deposits or withdrawals.
 */
const useTransactionListByDirection = (
  direction: 'deposits' | 'withdrawals'
) => {
  const PAGE_SIZE = 100

  const [transactions, setTransactions] = useState<Transfer[][]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  const { address } = useAccount()

  const cctpTransfers = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Goerli,
    l2ChainId: ChainId.ArbitrumGoerli,
    pageNumber: 0,
    pageSize: 1000,
    type: direction
  })

  const combinedCctpTransfers = [
    ...(cctpTransfers[direction]?.completed || []),
    ...(cctpTransfers[direction]?.pending || [])
  ]

  const cctpLoading =
    direction === 'deposits'
      ? cctpTransfers.isLoadingDeposits
      : cctpTransfers.isLoadingWithdrawals

  const shouldFetchNextPageForChainPair = useCallback(
    (chainPairIndex: number) => {
      if (page === 0) {
        return true
      }

      const txCountForChainPair = transactions[chainPairIndex]?.length ?? 0
      // fetch next page for a chain pair if all fetched pages are full
      // we check for >= in case some txs were included by initiating a transfer
      return txCountForChainPair / page >= PAGE_SIZE
    },
    [page, transactions]
  )

  const { data, error } = useSWRImmutable(
    address ? ['tx_list', direction, address, page] : null,
    ([, _direction, _address, _page]) => {
      return Promise.all(
        multiChainFetchList.map((chainPair, chainPairIndex) => {
          if (!shouldFetchNextPageForChainPair(chainPairIndex)) {
            return []
          }

          const params = {
            sender: _address,
            receiver: _address,
            l1Provider: getProvider(chainPair.parentChain),
            l2Provider: getProvider(chainPair.chain),
            pageNumber: _page,
            pageSize: PAGE_SIZE
          }

          return _direction === 'deposits'
            ? fetchDepositList(params)
            : fetchWithdrawalList(params)
        })
      )
    }
  )

  useEffect(() => {
    if (data) {
      // include the new data with the previously fetched data
      // the data is grouped by chain pairs
      setTransactions(prevTransactions =>
        data.map((transactionsForChainPair, chainPairIndex) => [
          ...(prevTransactions[chainPairIndex] ?? []),
          ...(transactionsForChainPair ?? [])
        ])
      )

      // if there is not a single full page in any of the data fetched, then there is no more to fetch
      const shouldFetchNextPage = data.some((_, chainPairIndex) =>
        shouldFetchNextPageForChainPair(chainPairIndex)
      )

      if (!shouldFetchNextPage) {
        setLoading(false)
        return
      }

      setPage(prevPage => prevPage + 1)
    }
  }, [data, shouldFetchNextPageForChainPair])

  return {
    data: [...transactions.flat(), ...combinedCctpTransfers].sort(
      sortByTimestampDescending
    ),
    loading: loading || cctpLoading,
    error
  }
}

/**
 * Fetches transaction history only, without mapping additional info that would require a lot of RPC calls.
 * The data is collected for multiple chain pairs, and sorted by date.
 */
const useMultiChainTransactionList = () => {
  const deposits = useTransactionListByDirection('deposits')
  const withdrawals = useTransactionListByDirection('withdrawals')

  const groupedTransactions = [deposits, withdrawals]

  // merge grouped transactions and sort them by date
  const data = groupedTransactions
    .flatMap(grp => grp.data)
    .sort(sortByTimestampDescending)
  // checks if any source is loading
  const loading = groupedTransactions.map(grp => grp.loading).some(Boolean)
  // get first error
  const error = groupedTransactions.map(grp => grp.error).filter(Boolean)[0]

  return { data, loading, error }
}

/**
 * Maps additional info to previously fetches transaction history, starting with the earliest data.
 * This is done in small batches to safely meet RPC limits.
 */
export const useCompleteMultiChainTransactions = (): {
  data: {
    transactions: MergedTransaction[]
    total: number | undefined
  }
  loading: boolean
  completed: boolean
  error: unknown
  pause: () => void
  resume: () => void
} => {
  // max number of transactions mapped in parallel, for the same chain pair
  // we can batch more than MAX_BATCH_SIZE at a time if they use a different RPC
  // MAX_BATCH_SIZE means max number of transactions in a batch for a chain pair
  const MAX_BATCH_SIZE = 5
  const PAUSE_SIZE = 20

  const [transactions, setTransactions] = useState<MergedTransaction[]>([])
  const [page, setPage] = useState(0)
  const [fetching, setFetching] = useState(true)

  const { data, loading, error } = useMultiChainTransactionList()
  const { address } = useAccount()

  const { data: mapData, error: mapError } = useSWRImmutable(
    address && !loading && fetching
      ? ['complete_tx_list', address, page]
      : null,
    ([, , _page]) => {
      // TODO: Need to allow more than MAX_BATCH_SIZE if they are for diff chain pairs
      // MAX_BATCH_SIZE refers to the same chain pair only
      const startIndex = _page * MAX_BATCH_SIZE
      const endIndex = startIndex + MAX_BATCH_SIZE

      return Promise.all(
        data.slice(startIndex, endIndex).map(tx => {
          if (isCctpTransfer(tx)) {
            return tx
          }
          return transformTransaction(tx)
        })
      )
    }
  )

  function pause() {
    setFetching(false)
  }

  function resume() {
    setFetching(true)
    setPage(prevPage => prevPage + 1)
  }

  useEffect(() => {
    if (mapData) {
      setTransactions(prevTransactions => {
        const newTransactions = mapData.filter(Boolean) as MergedTransaction[]
        return [...prevTransactions, ...newTransactions]
      })

      // mapped data is a full page, so we need to fetch more pages
      if (mapData.length === MAX_BATCH_SIZE) {
        setPage(prevPage => {
          // we fetched enough transactions to pause
          if (MAX_BATCH_SIZE * (prevPage + 1) >= PAUSE_SIZE) {
            pause()
            return prevPage
          }
          return prevPage + 1
        })
      } else {
        setFetching(false)
      }
    }
  }, [mapData])

  if (loading || error) {
    return {
      data: {
        transactions: [] as MergedTransaction[],
        total: undefined
      },
      completed: false,
      loading,
      error,
      pause,
      resume
    }
  }

  return {
    data: { transactions, total: data.length },
    loading: fetching,
    completed: transactions.length === data.length,
    error: mapError ?? error,
    pause,
    resume
  }
}
