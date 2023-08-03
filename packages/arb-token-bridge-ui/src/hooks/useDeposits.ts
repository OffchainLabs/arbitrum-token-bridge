import { useMemo } from 'react'
import { create } from 'zustand'
import useSWRImmutable from 'swr/immutable'
import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { isPending, transformDeposits } from '../state/app/utils'
import {
  FetchDepositParams,
  fetchDeposits
} from '../util/deposits/fetchDeposits'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { Transaction } from './useTransactions'
import {
  TxHistoryTransferTypes,
  getSubgraphQueryParams
} from '../util/SubgraphUtils'

export type CompleteDepositData = {
  deposits: Transaction[]
  pendingDeposits: Transaction[]
  transformedDeposits: MergedTransaction[]
}

type TotalForType = { [key in TxHistoryTransferTypes]: number }

const emptyTotalForType: TotalForType = {
  [TxHistoryTransferTypes.DepositSent]: 0,
  [TxHistoryTransferTypes.DepositReceived]: 0,
  [TxHistoryTransferTypes.RetryableSent]: 0,
  [TxHistoryTransferTypes.RetryableReceived]: 0
}

// Stores the last fetched index for each Transfer Type.
// With each page change we get the most recent txs and store number of txs fetched for the type.
export const useTxHistoryTotalTxFetched = create<{
  totalForType: TotalForType
  setTotalForType: (data: TotalForType) => void
  latestPage: number
  setLatestPage: (newPage: number) => void
}>(set => ({
  totalForType: emptyTotalForType,
  setTotalForType: newTotalForType => set({ totalForType: newTotalForType }),
  latestPage: 0,
  setLatestPage: newPage => set({ latestPage: newPage })
}))

function mapDepositsToTotalForType(txs: Transaction[]): TotalForType {
  const data = JSON.parse(JSON.stringify(emptyTotalForType))

  for (const tx of txs) {
    if (tx.transferType === TxHistoryTransferTypes.DepositReceived) {
    }
    const current = data[tx.transferType as TxHistoryTransferTypes]
    data[tx.transferType as TxHistoryTransferTypes] = current + 1
  }

  return data
}

function mergeTwoTotalForType(
  totalForType_1: TotalForType,
  totalForType_2: TotalForType
) {
  const result: TotalForType = { ...totalForType_1 }
  Object.keys(totalForType_1).map(type => {
    result[type as TxHistoryTransferTypes] =
      totalForType_1[type as TxHistoryTransferTypes] +
      totalForType_2[type as TxHistoryTransferTypes]
  })

  return result
}

function isValidAddTotalForType(
  currentTotalForType: TotalForType,
  pageNumber: number
) {
  let sumAll = 0

  Object.values(currentTotalForType).map(value => (sumAll += value))

  return sumAll <= pageNumber * 10
}

export const fetchCompleteDepositData = async ({
  walletAddress,
  totalForType,
  setTotalForType,
  depositParams
}: {
  walletAddress: string
  totalForType: TotalForType
  setTotalForType: (data: TotalForType) => void
  depositParams: FetchDepositParams & { pageNumber: number }
}): Promise<CompleteDepositData> => {

  const promises = Object.values(TxHistoryTransferTypes).map(type =>
    fetchDeposits({
      type,
      ...depositParams,
      ...getSubgraphQueryParams(type, walletAddress),
      totalFetched: totalForType[type]
    })
  )

  // get the original deposits
  const deposits = (await Promise.all(promises)).flat()
  const earliestDeposits = [...deposits]
    .sort((a, b) => Number(b.timestampCreated) - Number(a.timestampCreated))
    .slice(0, 10)

  // filter out pending deposits
  const pendingDepositsMap = new Map<string, boolean>()
  // get their complete transformed data (so that we get their exact status)
  const completeDepositData = transformDeposits(earliestDeposits)
  completeDepositData.forEach(completeTxData => {
    if (isPending(completeTxData)) {
      pendingDepositsMap.set(completeTxData.txId, true)
    }
  })
  const pendingDeposits = [...earliestDeposits].filter(
    tx => typeof pendingDepositsMap.get(tx.txID) !== 'undefined'
  )

  const latestTotalForType = mapDepositsToTotalForType(earliestDeposits)
  const newTotalForType = mergeTwoTotalForType(totalForType, latestTotalForType)
  setTotalForType(newTotalForType)

  return {
    deposits: earliestDeposits,
    pendingDeposits,
    transformedDeposits: completeDepositData
  }
}

export const useDeposits = (depositPageParams: PageParams) => {
  const { l1, l2 } = useNetworksAndSigners()
  const { totalForType, setTotalForType } = useTxHistoryTotalTxFetched()

  // only change l1-l2 providers (and hence, reload deposits) when the connected chain id changes
  // otherwise tx-history unnecessarily reloads on l1<->l2 network switch as well (#847)
  const l1Provider = useMemo(() => l1.provider, [l1.network.id])
  const l2Provider = useMemo(() => l2.provider, [l2.network.id])

  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  /* return the cached response for the complete pending transactions */
  return useSWRImmutable(
    [
      'deposits',
      walletAddress,
      l1Provider,
      l2Provider,
      depositPageParams.pageNumber,
      depositPageParams.pageSize,
      depositPageParams.searchString
    ],
    ([
      ,
      _walletAddress,
      _l1Provider,
      _l2Provider,
      _pageNumber,
      _pageSize,
      _searchString
    ]) =>
      fetchCompleteDepositData({
        walletAddress,
        totalForType,
        setTotalForType,
        depositParams: {
          l1Provider: _l1Provider,
          l2Provider: _l2Provider,
          pageNumber: _pageNumber,
          pageSize: _pageSize,
          searchString: _searchString
        }
      })
  )
}
