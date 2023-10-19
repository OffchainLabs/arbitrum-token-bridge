import { useLatest } from 'react-use'
import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { ChainId, rpcURLs } from '../util/networks'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { getWagmiChain } from '../util/wagmi/getWagmiChain'
import { useCallback, useEffect, useState } from 'react'
import { fetchWithdrawalList } from '../util/withdrawals/fetchWithdrawals'
import { fetchDepositList } from '../util/deposits/fetchDeposits'
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

export const PAGE_SIZE = 100

export type AdditionalProperties = {
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
  AdditionalProperties

type DepositOrWithdrawal = Deposit | Withdrawal

function getStandardizedTimestampByTx(tx: DepositOrWithdrawal) {
  if (isDeposit(tx)) {
    return tx.timestampCreated ?? 0
  }

  if (isWithdrawalFromSubgraph(tx)) {
    return getStandardizedTimestamp(tx.timestamp)
  }

  return getStandardizedTimestamp(tx.timestamp ?? '0')
}

function sortByTimestampDescending(
  a: DepositOrWithdrawal,
  b: DepositOrWithdrawal
) {
  return getStandardizedTimestampByTx(a) > getStandardizedTimestampByTx(b)
    ? -1
    : 1
}

const multiChainFetchList: { parentChain: ChainId; chain: ChainId }[] = [
  {
    parentChain: ChainId.Mainnet,
    chain: ChainId.ArbitrumOne
  },
  // {
  //   parentChain: ChainId.Mainnet,
  //   chain: ChainId.ArbitrumNova
  // },
  // // Testnet
  {
    parentChain: ChainId.Goerli,
    chain: ChainId.ArbitrumGoerli
  },
  {
    parentChain: ChainId.Sepolia,
    chain: ChainId.ArbitrumSepolia
  }
  // Orbit
  // {
  //   parentChain: ChainId.ArbitrumGoerli,
  //   chain: ChainId.XaiTestnet
  // }
  // {
  //   parentChain: ChainId.ArbitrumSepolia,
  //   chain: ChainId.StylusTestnet
  // }
]

function isWithdrawalFromSubgraph(
  tx: Withdrawal
): tx is FetchWithdrawalsFromSubgraphResult & AdditionalProperties {
  return tx.source === 'subgraph'
}

function isDeposit(tx: DepositOrWithdrawal): tx is Deposit {
  return tx.direction === 'deposit'
}

async function transformTransaction(tx: DepositOrWithdrawal) {
  const parentChainProvider = getProvider(tx.parentChainId)
  const chainProvider = getProvider(tx.chainId)

  if (isDeposit(tx)) {
    return transformDeposit(
      await updateAdditionalDepositData(tx, parentChainProvider, chainProvider)
    )
  }

  let withdrawal: L2ToL1EventResultPlus | undefined

  if (isWithdrawalFromSubgraph(tx)) {
    withdrawal = await mapWithdrawalToL2ToL1EventResult(
      tx,
      parentChainProvider,
      chainProvider,
      tx.parentChainId,
      tx.chainId
    )
  } else {
    if (isTokenWithdrawal(tx)) {
      withdrawal = await mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
        tx,
        parentChainProvider,
        chainProvider,
        tx.parentChainId,
        tx.chainId
      )
    } else {
      withdrawal = await mapETHWithdrawalToL2ToL1EventResult(
        tx,
        parentChainProvider,
        chainProvider,
        tx.parentChainId,
        tx.chainId
      )
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
  const [transactions, setTransactions] = useState<DepositOrWithdrawal[][]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  const latestTransactions = useLatest(transactions)
  const latestPage = useLatest(page)

  const { address } = useAccount()

  const shouldFetchPage = useCallback(
    (index: number) => {
      const _page = latestPage.current

      if (_page === 0) {
        return true
      }

      const txCount = latestTransactions.current[index]?.length ?? 0
      // fetch next page for a chain pair if all fetched pages are full
      // we check for >= in case some txs were included by initiating a transfer
      return txCount / _page + 1 >= PAGE_SIZE
    },
    [latestTransactions, latestPage]
  )

  const { data, error } = useSWRImmutable(
    address ? [direction, address, page] : null,
    ([_direction, _address, _page]) => {
      return Promise.all(
        multiChainFetchList.map((c, index) => {
          if (!shouldFetchPage(index)) {
            return []
          }

          const params = {
            sender: _address,
            receiver: _address,
            l1Provider: getProvider(c.parentChain),
            l2Provider: getProvider(c.chain),
            pageNumber: _page
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
      // if there is not a single full page in any of the data fetched, then there is no more to fetch
      const shouldFetchNextPage = data.some((_, index) =>
        shouldFetchPage(index)
      )

      // include the new data with the previously fetched data
      // the data is grouped by chain pairs
      setTransactions(prevTransactions => {
        return data.map((transactionsForChainPair, chainPairIndex) => {
          const prevTransactionsForChainPair = prevTransactions[chainPairIndex]
          return [
            ...(prevTransactionsForChainPair
              ? prevTransactionsForChainPair
              : []),
            ...(transactionsForChainPair ? transactionsForChainPair : [])
          ]
        })
      })

      if (!shouldFetchNextPage) {
        setLoading(false)
        return
      }

      setPage(prevPage => prevPage + 1)
    }
  }, [data, shouldFetchPage])

  return {
    data: transactions.flat(),
    loading,
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
  const error =
    groupedTransactions.map(grp => grp.error).filter(Boolean)[0] ?? null

  return { data, loading, error }
}

/**
 * Maps additional info to previously fetches transaction history, starting with the earliest data.
 * This is done in small batches to safely meet RPC limits.
 */
export const useCompleteMultiChainTransactions = () => {
  // max number of transactions mapped in parallel, for the same chain pair
  // we can batch more than MAX_BATCH_SIZE at a time if they use a different RPC
  // MAX_BATCH_SIZE means max number of transactions in a batch for a chain pair
  const MAX_BATCH_SIZE = 5

  const [transactions, setTransactions] = useState<MergedTransaction[]>([])
  const [page, setPage] = useState(0)
  const [fetching, setFetching] = useState(true)
  const [paused, setPaused] = useState(false)

  const { data, loading, error } = useMultiChainTransactionList()
  const { address } = useAccount()

  const { data: mapData, error: mapError } = useSWRImmutable(
    address && !loading ? [address, page] : null,
    ([, _page]) => {
      // TODO: Need to allow more than MAX_BATCH_SIZE if they are for diff chain pairs
      // MAX_BATCH_SIZE refers to the same chain pair only
      const startIndex = _page * MAX_BATCH_SIZE
      const endIndex = startIndex + MAX_BATCH_SIZE

      return Promise.all(
        data.slice(startIndex, endIndex).map(tx => transformTransaction(tx))
      )
    }
  )

  useEffect(() => {
    if (mapData) {
      setTransactions(prevTransactions => [
        ...prevTransactions,
        ...(mapData.filter(Boolean) as MergedTransaction[])
      ])

      if (mapData.length === MAX_BATCH_SIZE) {
        // full batch size has been mapped, which means there may be more txs to map
        setPage(prevPage => prevPage + 1)
      } else {
        setFetching(false)
      }
    }
  }, [mapData])

  if (loading || error) {
    return { data: { transactions: [], total: undefined }, loading, error }
  }

  return {
    data: { transactions, total: data.length },
    completed: !fetching && !paused,
    paused,
    error: mapError ?? error ?? null
  }
}
