import { useMemo } from 'react'
import { Address } from 'viem'
import useSWRImmutable from 'swr/immutable'
import useSWR from 'swr'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { useArbitrumIndexer } from '../../../../indexer-provider'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { BigNumber, utils } from 'ethers'
import { ether } from '../../constants'
import {
  sortByTimestampDescending,
  UseTransactionHistoryResult
} from '../../hooks/useTransactionHistory'
import { isExperimentalFeatureEnabled } from '../../util'
import { useTokensFromLists } from '../TransferPanel/TokenSearchUtils'
import { fetchErc20Data } from '../../util/TokenUtils'

type PartialTransfer = {
  fromAddress: string
  toAddress: string
  timestamp: bigint
  executionTimestamp: bigint
  status: string
  amount: bigint
  txHash: string
  childChainId: number
  parentChainId: number
}

type EthIndexerTransfer = PartialTransfer & {
  type: 'ETH'
  tokenAddress: undefined
}

type Erc20IndexerTransfer = PartialTransfer & {
  type: 'ERC20'
  tokenAddress: string
}

type IndexerTransfer = EthIndexerTransfer | Erc20IndexerTransfer

function getIndexerTransferStatus(tx: IndexerTransfer) {
  switch (tx.status) {
    case 'PARENT_CHAIN_CONFIRMED':
    case 'CHILD_CHAIN_REDEMPTION_SCHEDULED':
      return 'pending'
    case 'CHILD_CHAIN_EXECUTED':
      return 'success'
    default:
      return 'failure'
  }
}

function getIndexerDepositStatus(tx: IndexerTransfer): DepositStatus {
  switch (tx.status) {
    case 'PARENT_CHAIN_CONFIRMED':
      return DepositStatus.L1_PENDING
    case 'CHILD_CHAIN_REDEMPTION_SCHEDULED':
      return DepositStatus.L2_PENDING
    case 'CHILD_CHAIN_EXECUTED':
      return DepositStatus.L2_SUCCESS
    default:
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
  tx: IndexerTransfer
  tokenDetails?: TokenDetails | undefined
}): MergedTransaction {
  const { tx } = params
  const tokenDetails =
    'tokenDetails' in params ? params.tokenDetails : undefined

  return {
    sender: tx.fromAddress,
    destination: tx.toAddress,
    direction: 'deposit',
    depositStatus: getIndexerDepositStatus(tx),
    status: getIndexerTransferStatus(tx),
    createdAt: Number(tx.timestamp) * 1_000,
    resolvedAt: Number(tx.executionTimestamp) * 1_000,
    txId: tx.txHash,
    asset: tokenDetails?.symbol ?? ether.symbol,
    assetType: tx.type as AssetType,
    value: utils.formatUnits(
      tx.amount,
      tokenDetails?.decimals ?? ether.decimals
    ),
    uniqueId: BigNumber.from(0),
    isWithdrawal: false,
    blockNum: 0,
    tokenAddress: tx.tokenAddress || null,
    childChainId: tx.childChainId,
    parentChainId: tx.parentChainId,
    sourceChainId: tx.parentChainId,
    destinationChainId: tx.childChainId
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
    ] as never as IndexerTransfer[]
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
      return _indexerTransactions.map(tx => {
        if (tx.type === 'ETH') {
          return transformIndexerTransfer({ tx })
        }

        const tokenDetails = _tokenDetailsMap[tx.tokenAddress]

        if (!tokenDetails) {
          throw new Error(
            'Failed to fetch token data for ERC-20 indexer transfer.'
          )
        }

        return transformIndexerTransfer({ tx, tokenDetails })
      })
    },
    {
      onSuccess: data => data.sort(sortByTimestampDescending)
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
