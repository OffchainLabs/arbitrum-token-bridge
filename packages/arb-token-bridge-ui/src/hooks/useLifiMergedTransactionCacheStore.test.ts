import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useLifiMergedTransactionCacheStore } from './useLifiMergedTransactionCacheStore'
import {
  DepositStatus,
  LifiMergedTransaction,
  WithdrawalStatus
} from '../state/app/state'
import { AssetType } from './arbTokenBridge.types'
import dayjs from 'dayjs'
import { BigNumber, constants } from 'ethers'
import { shallow } from 'zustand/shallow'

function createMockedLifiTransaction({
  hash,
  sender,
  destinationAddress
}: {
  hash: string
  sender: string
  destinationAddress: string
}): LifiMergedTransaction {
  return {
    txId: hash,
    asset: 'ETH',
    assetType: AssetType.ETH,
    blockNum: null,
    createdAt: dayjs().valueOf(),
    direction: 'withdraw',
    isWithdrawal: true,
    resolvedAt: null,
    status: WithdrawalStatus.UNCONFIRMED,
    destinationStatus: WithdrawalStatus.UNCONFIRMED,
    uniqueId: null,
    value: '0',
    depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
    destination: destinationAddress ?? sender,
    sender,
    isLifi: true,
    tokenAddress: constants.AddressZero,
    parentChainId: 1,
    childChainId: 42161,
    sourceChainId: 42161,
    destinationChainId: 1,
    toolDetails: {
      key: 'lifi',
      logoURI: '',
      name: 'name'
    },
    durationMs: 1_000,
    fromAmount: {
      amount: BigNumber.from(10),
      token: {
        address: constants.AddressZero,
        decimals: 18,
        symbol: 'ETH'
      }
    },
    toAmount: {
      amount: BigNumber.from(9),
      token: {
        address: constants.AddressZero,
        decimals: 18,
        symbol: 'ETH'
      }
    },
    destinationTxId: null,
    transactionRequest: {}
  }
}

describe('useLifiMergedTransactionCacheStore', () => {
  it('should return undefined by default', async () => {
    const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33'
    const { result } = renderHook(() =>
      useLifiMergedTransactionCacheStore(
        state => state.transactions[walletAddress]
      )
    )

    expect(result.current).toEqual(undefined)
  })

  it('should cache transaction for sender and destination address', async () => {
    const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33'
    const { result } = renderHook(() =>
      useLifiMergedTransactionCacheStore(
        state => ({
          addTransaction: state.addTransaction,
          transactions: state.transactions
        }),
        shallow
      )
    )

    const sameDestinationTransaction = createMockedLifiTransaction({
      hash: '0x240c2c89b5f153b0cc1fce5ea709473b858359887d0aa1d4157fe130c95d2134',
      sender: walletAddress,
      destinationAddress: walletAddress
    })
    await act(async () => {
      result.current.addTransaction(sameDestinationTransaction)
    })

    await waitFor(() => {
      // Transaction is added to cache only once
      expect(result.current.transactions[walletAddress]).toEqual([
        sameDestinationTransaction
      ])
    })

    const customDestinationAddress =
      '0x7503Aad60fd0d205702b0Dcd945a1b36c42101b3'
    const differentDestinationTransaction = createMockedLifiTransaction({
      hash: '0x7aca61daf6b90259aa8e40a57cba32a234650fa681691c53a0de09187226694c',
      sender: walletAddress,
      destinationAddress: customDestinationAddress
    })
    await act(async () => {
      result.current.addTransaction(differentDestinationTransaction)
    })

    const { result: resultAfterChanges } = renderHook(() =>
      useLifiMergedTransactionCacheStore(
        state => ({
          addTransaction: state.addTransaction,
          transactions: state.transactions
        }),
        shallow
      )
    )
    await waitFor(() => {
      // Transaction is added to cache for sender
      expect(resultAfterChanges.current.transactions[walletAddress]).toEqual([
        differentDestinationTransaction,
        sameDestinationTransaction
      ])

      // Transaction is added to cache for custom address
      expect(
        resultAfterChanges.current.transactions[customDestinationAddress]
      ).toEqual([differentDestinationTransaction])
    })
  })
})
