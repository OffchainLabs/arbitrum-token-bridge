import useSWRImmutable from 'swr/immutable'
import { useCallback, useEffect, useState } from 'react'

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
 * Fetches transaction history only for deposits and withdrawals, without their statuses.
 */
const useTransactionHistoryWithoutStatuses = (address: string | undefined) => {
  const [deposits, setDeposits] = useState<Deposit[][]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[][]>([])

  const [depositsPage, setDepositsPage] = useState(0)
  const [withdrawalsPage, setWithdrawalsPage] = useState(0)

  const [depositsLoading, setDepositsLoading] = useState(true)
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true)

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
  const transactions = [...deposits, ...withdrawals]
    .flat()
    .sort(sortByTimestampDescending)

  return {
    data: transactions,
    loading: depositsLoading || withdrawalsLoading,
    error: depositsError ?? withdrawalsError
  }
}

/**
 * Maps additional info to previously fetches transaction history, starting with the earliest data.
 * This is done in small batches to safely meet RPC limits.
 */
export const useTransactionHistory = (address: string | undefined) => {
  // max number of transactions mapped in parallel, for the same chain pair
  // we can batch more than MAX_BATCH_SIZE at a time if they use a different RPC
  // MAX_BATCH_SIZE means max number of transactions in a batch for a chain pair
  const MAX_BATCH_SIZE = 5

  const [transactions, setTransactions] = useState<MergedTransaction[]>([])
  const [page, setPage] = useState(0)
  const [fetching, setFetching] = useState(true)
  const [paused, setPaused] = useState(false)

  const { data, loading, error } = useTransactionHistoryWithoutStatuses(address)

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
    return {
      data: { transactions: [] as MergedTransaction[], total: undefined },
      loading,
      error
    }
  }

  return {
    data: { transactions, total: data.length },
    loading: fetching,
    completed: !fetching && !paused,
    paused,
    error: mapError ?? error
  }
}
