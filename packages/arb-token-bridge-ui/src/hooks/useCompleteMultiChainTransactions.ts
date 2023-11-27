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

const PAGE_SIZE = 100

export type Deposit = Transaction

export type Withdrawal =
  | FetchWithdrawalsFromSubgraphResult
  | WithdrawalInitiated
  | EthWithdrawal

type DepositOrWithdrawal = Deposit | Withdrawal

function getStandardizedTimestampByTx(tx: DepositOrWithdrawal) {
  if (isDeposit(tx)) {
    return tx.timestampCreated ?? 0
  }

  if (isWithdrawalFromSubgraph(tx)) {
    return getStandardizedTimestamp(tx.l2BlockTimestamp)
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
    parentChain: ChainId.Ethereum,
    chain: ChainId.ArbitrumOne
  },
  // {
  //   parentChain: ChainId.Mainnet,
  //   chain: ChainId.ArbitrumNova
  // },
  // Testnet
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
): tx is FetchWithdrawalsFromSubgraphResult {
  return tx.source === 'subgraph'
}

function isDeposit(tx: DepositOrWithdrawal): tx is Deposit {
  return tx.direction === 'deposit'
}

async function transformTransaction(
  tx: DepositOrWithdrawal
): Promise<MergedTransaction | undefined> {
  const parentChainProvider = getProvider(tx.parentChainId)
  const childChainProvider = getProvider(tx.childChainId)

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

  const { address } = useAccount()

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
    if (!data) {
      return
    }

    const fetchedSomeData = data.some(item => item.length > 0)

    if (fetchedSomeData) {
      // include the new data with the previously fetched data
      // the data is grouped by chain pairs
      setTransactions(prevTransactions => {
        return data.map((transactionsForChainPair, chainPairIndex) => [
          ...(prevTransactions[chainPairIndex] ?? []),
          ...(transactionsForChainPair ?? [])
        ])
      })

      setPage(prevPage => prevPage + 1)
    } else {
      setLoading(false)
    }
  }, [data])

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
  const error = groupedTransactions.map(grp => grp.error).filter(Boolean)[0]

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
    address && !loading ? ['complete_tx_list', address, page, data] : null,
    ([, , _page, _data]) => {
      // TODO: Need to allow more than MAX_BATCH_SIZE if they are for diff chain pairs
      // MAX_BATCH_SIZE refers to the same chain pair only
      const startIndex = _page * MAX_BATCH_SIZE
      const endIndex = startIndex + MAX_BATCH_SIZE

      return Promise.all(
        _data.slice(startIndex, endIndex).map(transformTransaction)
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
    error: mapError ?? error
  }
}
