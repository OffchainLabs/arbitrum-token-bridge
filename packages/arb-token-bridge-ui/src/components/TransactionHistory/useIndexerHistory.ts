import { useMemo } from 'react'
import { Address } from 'viem'
import useSWRImmutable from 'swr/immutable'
import useSWR from 'swr'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { useArbitrumIndexer, type Transfer } from '@arbitrum/indexer-provider'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import {
  DepositStatus,
  MergedTransaction,
  WithdrawalStatus
} from '../../state/app/state'
import { BigNumber, utils } from 'ethers'
import { ether } from '../../constants'
import {
  sortByTimestampDescending,
  UseTransactionHistoryResult
} from '../../hooks/useTransactionHistory'
import { isExperimentalFeatureEnabled } from '../../util'
import { useTokensFromLists } from '../TransferPanel/TokenSearchUtils'
import { fetchErc20Data } from '../../util/TokenUtils'

type EthIndexerTransfer = Transfer & {
  type: 'ETH'
  tokenAddress?: undefined
}

type Erc20IndexerTransfer = Transfer & {
  type: 'ERC20'
  tokenAddress: string
}

const isWithdrawalKind = (kind: Transfer['kind']) => kind.startsWith('WITHDRAW')

const isErc20Transfer = (tx: Transfer): tx is Erc20IndexerTransfer =>
  tx.type === 'ERC20' && typeof tx.tokenAddress === 'string'

function getIndexerTransferStatus(tx: Transfer) {
  const isWithdrawal = isWithdrawalKind(tx.kind)
  switch (tx.status) {
    case 'SOURCE_CONFIRMED':
    case 'DESTINATION_SCHEDULED':
      return isWithdrawal ? WithdrawalStatus.UNCONFIRMED : 'pending'
    case 'DESTINATION_CONFIRMED':
      return isWithdrawal ? WithdrawalStatus.EXECUTED : 'success'
    case 'DESTINATION_FAILED':
      return isWithdrawal ? WithdrawalStatus.FAILURE : 'failure'
  }
}

function getIndexerDepositStatus(tx: Transfer): DepositStatus | undefined {
  if (isWithdrawalKind(tx.kind)) {
    return undefined
  }
  switch (tx.status) {
    case 'SOURCE_CONFIRMED':
    case 'DESTINATION_SCHEDULED':
      return DepositStatus.L2_PENDING
    case 'DESTINATION_CONFIRMED':
      return DepositStatus.L2_SUCCESS
    case 'DESTINATION_FAILED':
      return DepositStatus.L2_FAILURE
  }
}

type TokenDetails = {
  name: string
  symbol: string
  decimals: number
}

function transformIndexerTransfer(params: {
  tx: EthIndexerTransfer
  tokenDetails?: undefined
}): MergedTransaction

function transformIndexerTransfer(params: {
  tx: Erc20IndexerTransfer
  tokenDetails: TokenDetails
}): MergedTransaction

function transformIndexerTransfer(params: {
  tx: Transfer
  tokenDetails?: TokenDetails | undefined
}): MergedTransaction {
  const { tx } = params
  const tokenDetails =
    'tokenDetails' in params ? params.tokenDetails : undefined

  const isWithdrawal = isWithdrawalKind(tx.kind)
  const createdAt = Number(tx.timestamp) * 1_000
  const resolvedAt = tx.executionTimestamp
    ? Number(tx.executionTimestamp) * 1_000
    : null

  return {
    sender: tx.fromAddress,
    destination: tx.toAddress,
    direction: isWithdrawal ? 'outbox' : 'deposit',
    depositStatus: getIndexerDepositStatus(tx),
    status: getIndexerTransferStatus(tx),
    createdAt,
    resolvedAt,
    txId: tx.txHash,
    asset: tokenDetails?.symbol ?? ether.symbol,
    assetType: tx.type as AssetType,
    value: utils.formatUnits(
      tx.amount,
      tokenDetails?.decimals ?? ether.decimals
    ),
    uniqueId: BigNumber.from(tx.sequenceNumber ?? 0),
    isWithdrawal,
    blockNum: null,
    tokenAddress: tx.tokenAddress ?? null,
    childChainId: tx.childChainId,
    parentChainId: tx.parentChainId,
    sourceChainId: isWithdrawal ? tx.childChainId : tx.parentChainId,
    destinationChainId: isWithdrawal ? tx.parentChainId : tx.childChainId
  }
}

export const useIndexerHistory = (
  address?: Address
): Omit<
  UseTransactionHistoryResult,
  'addPendingTransaction' | 'updatePendingTransaction'
> => {
  const isIndexerEnabled = isExperimentalFeatureEnabled('indexer')
  // todo: allow undefined in indexer and return empty
  const _address = address ?? ''

  const tokensFromLists = useTokensFromLists()

  const { pendingTransfers, completedTransfers, isLoading, error } =
    useArbitrumIndexer(isIndexerEnabled ? _address : '')

  const indexerTransactions = useMemo(() => {
    return [
      ...pendingTransfers,
      ...completedTransfers
      // move types to indexer
    ] as Transfer[]
  }, [pendingTransfers, completedTransfers])

  // todo: cache
  const { data: tokenDetailsMap } = useSWRImmutable(
    [indexerTransactions, tokensFromLists, 'indexerTokenDetails'] as const,
    async ([_indexerTransactions, _tokensFromLists]) => {
      const result: { [key in string]: TokenDetails } = {}

      for (let i = 0; i < _indexerTransactions.length; i++) {
        const tx = _indexerTransactions[i]
        const tokenAddress = tx?.tokenAddress

        if (!tokenAddress || result[tokenAddress]) continue

        const tokenFromLists = _tokensFromLists[tokenAddress]
        if (tokenFromLists) {
          const { name, symbol, decimals } = tokenFromLists
          result[tokenAddress] = { name, symbol, decimals }
          continue
        }

        // todo: use https://www.npmjs.com/package/p-limit to fetch token in batches
        // also don't refetch the same token
        const { name, symbol, decimals } = await fetchErc20Data({
          address: tokenAddress,
          provider: getProviderForChainId(tx.parentChainId)
        })

        result[tokenAddress] = { name, symbol, decimals }
      }

      return result
    }
  )

  const { data: transactions = [] } = useSWR(
    tokenDetailsMap
      ? ([indexerTransactions, tokenDetailsMap, 'indexerTransactions'] as const)
      : null,
    ([_indexerTransactions, _tokenDetailsMap]) => {
      const mapped = _indexerTransactions.map(tx => {
        if (!isErc20Transfer(tx)) {
          return transformIndexerTransfer({ tx: tx as EthIndexerTransfer })
        }

        const tokenDetails = _tokenDetailsMap[tx.tokenAddress]

        if (!tokenDetails) {
          throw new Error(
            'Failed to fetch token data for ERC-20 indexer transfer.'
          )
        }

        return transformIndexerTransfer({ tx, tokenDetails })
      })
      return mapped.sort(sortByTimestampDescending)
    }
  )

  return {
    transactions,
    loading: isLoading,
    // TODO: This will need to be based on pagination
    completed: !isLoading,
    failedChainPairs: [],
    error,
    pause: () => {},
    resume: () => {}
  }
}
