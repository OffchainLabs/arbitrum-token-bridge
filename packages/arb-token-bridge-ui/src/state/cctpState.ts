import { BigNumber } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import useSWRImmutable from 'swr/immutable'
import * as Sentry from '@sentry/react'

import { useCCTP } from '../hooks/CCTP/useCCTP'
import { ChainId, getBlockTime } from '../util/networks'
import { fetchCCTPDeposits, fetchCCTPWithdrawals } from '../util/cctp/fetchCCTP'
import { DepositStatus, MergedTransaction } from './app/state'
import { getStandardizedTimestamp } from './app/utils'
import { useBlockNumber, useSigner } from 'wagmi'
import dayjs from 'dayjs'
import { CCTPSupportedChainId } from '../pages/api/cctp/[type]'

// see https://developers.circle.com/stablecoin/docs/cctp-technical-reference#block-confirmations-for-attestations
export function getBlockBeforeConfirmation(
  chainId: CCTPSupportedChainId | undefined
) {
  if (!chainId) {
    return 65
  }

  return {
    [ChainId.Mainnet]: 65,
    [ChainId.ArbitrumOne]: 65,
    [ChainId.Goerli]: 5,
    [ChainId.ArbitrumGoerli]: 5
  }[chainId]
}

type fetchCctpParams = {
  walletAddress?: string
  l1ChainId: ChainId
  pageNumber: number
  pageSize: number
  enabled: boolean
}
export const useCCTPDeposits = ({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  enabled
}: fetchCctpParams) => {
  const { data, error, isLoading } = useSWRImmutable(
    // Only fetch when we have walletAddress
    () => {
      if (!walletAddress || !enabled) {
        return null
      }

      return [
        walletAddress,
        l1ChainId,
        pageNumber,
        pageSize,
        'cctp-deposits'
      ] as const
    },
    ([_walletAddress, _l1ChainId, _pageNumber, _pageSize]) =>
      fetchCCTPDeposits({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId,
        pageNumber: _pageNumber,
        pageSize: _pageSize
      })
  )

  return { data, error, isLoading }
}

export const useCCTPWithdrawals = ({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  enabled
}: fetchCctpParams) => {
  const { data, error, isLoading, isValidating } = useSWRImmutable(
    // Only fetch when we have walletAddress
    () => {
      if (!walletAddress || !enabled) {
        return null
      }

      return [
        walletAddress,
        l1ChainId,
        pageNumber,
        pageSize,
        'cctp-withdrawals'
      ] as const
    },
    ([_walletAddress, _l1ChainId, _pageNumber, _pageSize]) =>
      fetchCCTPWithdrawals({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId,
        pageNumber: _pageNumber,
        pageSize: _pageSize
      })
  )

  return { data, error, isLoading, isValidating }
}

type PartialMergedTransaction = Partial<Omit<MergedTransaction, 'cctpData'>> & {
  txId: MergedTransaction['txId']
  cctpData?: Partial<MergedTransaction['cctpData']>
}
type CctpStore = {
  transfers: { [id: string]: MergedTransaction }
  transfersIds: string[]
  setTransfers: (transfers: {
    pending: MergedTransaction[]
    completed: MergedTransaction[]
  }) => void
  resetTransfers: () => void
  setPendingTransfer: (transfer: MergedTransaction) => void
  updateTransfer: (transfer: PartialMergedTransaction) => void
}

const useCctpStore = create<CctpStore>((set, get) => ({
  transfers: {},
  transfersIds: [],
  resetTransfers: () => {
    return set({
      transfers: {},
      transfersIds: []
    })
  },
  setTransfers: transfers => {
    const pendings = transfers.pending
    const completeds = transfers.completed

    const transfersMap = get().transfers
    const ids = [...get().transfersIds]

    const transactions = [...pendings, ...completeds]
      .concat(Object.values(transfersMap))
      .sort((t1, t2) => (t2.blockNum || 0) - (t1.blockNum || 0))

    for (const transfer of transactions) {
      if (!transfersMap[transfer.txId]) {
        transfersMap[transfer.txId] = transfer
        ids.push(transfer.txId)
      }
    }

    return set({
      transfers: transfersMap,
      transfersIds: ids
    })
  },
  setPendingTransfer: async transfer => {
    return set(prevState => ({
      transfers: {
        ...prevState.transfers,
        [transfer.txId]: transfer
      },
      // Set the new transfer as first item (showing first in pending transaction)
      transfersIds: [...new Set([transfer.txId].concat(prevState.transfersIds))]
    }))
  },
  updateTransfer: transfer => {
    const prevTransfer = get().transfers[transfer.txId]
    if (!prevTransfer) {
      return
    }

    set(prevState => ({
      transfers: {
        ...prevState.transfers,
        [transfer.txId]: {
          ...prevTransfer,
          ...transfer,
          cctpData: {
            ...prevTransfer.cctpData,
            ...transfer.cctpData
          }
        } as MergedTransaction
      }
    }))
  }
}))

export function useCctpState() {
  const {
    transfersIds,
    transfers,
    resetTransfers,
    setTransfers,
    setPendingTransfer,
    updateTransfer
  } = useCctpStore()

  const { pendingIds, completedIds, depositIds, withdrawalIds } =
    useMemo(() => {
      return transfersIds.reduce(
        (acc, id) => {
          const transfer = transfers[id]
          if (!transfer) {
            return acc
          }

          if (transfer.direction === 'deposit') {
            acc.depositIds.push(id)
          } else {
            acc.withdrawalIds.push(id)
          }
          if (
            transfer.depositStatus === DepositStatus.CCTP_SOURCE_PENDING ||
            transfer.depositStatus === DepositStatus.CCTP_SOURCE_SUCCESS
          ) {
            acc.pendingIds.push(id)
          } else {
            acc.completedIds.push(id)
          }

          return acc
        },
        {
          pendingIds: [] as string[],
          completedIds: [] as string[],
          depositIds: [] as string[],
          withdrawalIds: [] as string[]
        }
      )
    }, [transfersIds, transfers])

  return {
    setPendingTransfer,
    resetTransfers,
    setTransfers,
    transfersIds,
    transfers,
    pendingIds,
    completedIds,
    depositIds,
    withdrawalIds,
    updateTransfer
  }
}

type useCctpFetchingParams = {
  l1ChainId: ChainId
  walletAddress: `0x${string}` | undefined
  pageSize: number
  pageNumber: number
  type: 'deposits' | 'withdrawals' | 'all'
}
export function useCctpFetching({
  l1ChainId,
  walletAddress,
  pageSize = 10,
  pageNumber,
  type
}: useCctpFetchingParams) {
  const {
    data: deposits,
    isLoading: isLoadingDeposits,
    error: depositsError
  } = useCCTPDeposits({
    l1ChainId,
    walletAddress,
    pageNumber,
    pageSize,
    enabled: type !== 'withdrawals'
  })
  const {
    data: withdrawals,
    isLoading: isLoadingWithdrawals,
    error: withdrawalsError
  } = useCCTPWithdrawals({
    l1ChainId,
    walletAddress,
    pageNumber,
    pageSize,
    enabled: type !== 'deposits'
  })
  const { setTransfers } = useCctpState()

  useEffect(() => {
    if (deposits) {
      setTransfers(deposits)
    }
  }, [deposits, setTransfers])

  useEffect(() => {
    if (withdrawals) {
      setTransfers(withdrawals)
    }
  }, [withdrawals, setTransfers])

  return {
    deposits,
    withdrawals,
    isLoadingDeposits,
    isLoadingWithdrawals,
    depositsError,
    withdrawalsError
  }
}

export function useClaimCctp(tx: MergedTransaction) {
  const [isClaiming, setIsClaiming] = useState(false)
  const { waitForAttestation, receiveMessage } = useCCTP({
    sourceChainId: tx.cctpData?.sourceChainId
  })

  const { updateTransfer } = useCctpState()
  const { data: signer } = useSigner()

  const claim = useCallback(async () => {
    if (!tx.cctpData?.attestationHash || !tx.cctpData.messageBytes || !signer) {
      return
    }

    setIsClaiming(true)
    try {
      const attestation = await waitForAttestation(tx.cctpData.attestationHash)
      const receiveTx = await receiveMessage({
        attestation,
        messageBytes: tx.cctpData.messageBytes as `0x${string}`,
        signer
      })
      const receiveReceiptTx = await receiveTx.wait()
      updateTransfer({
        ...tx,
        resolvedAt: getStandardizedTimestamp(
          BigNumber.from(Date.now()).toString()
        ),
        status: 'Executed',
        depositStatus: DepositStatus.CCTP_DESTINATION_SUCCESS,
        cctpData: {
          ...tx.cctpData,
          receiveMessageTransactionHash:
            receiveReceiptTx.transactionHash as `0x${string}`
        }
      })
    } catch (e) {
      Sentry.captureException(e)
    } finally {
      setIsClaiming(false)
    }
  }, [receiveMessage, signer, tx, updateTransfer, waitForAttestation])

  return {
    isClaiming,
    claim
  }
}

export function getL1ChainIdFromSourceChain(tx: MergedTransaction) {
  if (!tx.cctpData) {
    return ChainId.Mainnet
  }

  return {
    [ChainId.Mainnet]: ChainId.Mainnet,
    [ChainId.Goerli]: ChainId.Goerli,
    [ChainId.ArbitrumOne]: ChainId.Mainnet,
    [ChainId.ArbitrumGoerli]: ChainId.Goerli
  }[tx.cctpData.sourceChainId]
}

export function useRemainingTime(tx: MergedTransaction) {
  const { data: currentBlockNumber } = useBlockNumber({
    chainId: tx.cctpData?.sourceChainId,
    watch: true
  })

  const requiredBlocksBeforeConfirmation = getBlockBeforeConfirmation(
    tx.cctpData?.sourceChainId as CCTPSupportedChainId
  )

  const l1SourceChain = getL1ChainIdFromSourceChain(tx)
  const blockTime =
    tx.direction === 'deposit' ? getBlockTime(l1SourceChain) : 15

  const [remainingTime, setRemainingTime] = useState<string | null>(
    'Calculating...'
  )
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    if (!currentBlockNumber || !tx.blockNum) {
      return
    }

    const elapsedBlocks = Math.max(currentBlockNumber - tx.blockNum, 0)
    const blocksLeftBeforeConfirmation = Math.max(
      requiredBlocksBeforeConfirmation - elapsedBlocks,
      0
    )
    const withdrawalDate = dayjs().add(
      blocksLeftBeforeConfirmation * blockTime,
      'second'
    )

    if (blocksLeftBeforeConfirmation === 0) {
      setIsConfirmed(true)
    }
    setRemainingTime(dayjs().to(withdrawalDate, true))
  }, [
    blockTime,
    currentBlockNumber,
    requiredBlocksBeforeConfirmation,
    tx.blockNum
  ])

  return {
    remainingTime,
    isConfirmed
  }
}
