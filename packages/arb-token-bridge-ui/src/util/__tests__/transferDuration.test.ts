import { RenderHookResult, act, renderHook } from '@testing-library/react'
import { MergedTransaction } from '../../state/app/state'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import dayjs from 'dayjs'
import {
  DEPOSIT_TIME_MINUTES_MAINNET,
  DEPOSIT_TIME_MINUTES_ORBIT_MAINNET,
  DEPOSIT_TIME_MINUTES_ORBIT_TESTNET,
  DEPOSIT_TIME_MINUTES_TESTNET,
  TRANSFER_TIME_MINUTES_CCTP_MAINNET,
  TRANSFER_TIME_MINUTES_CCTP_TESTNET,
  useTransferDuration
} from '../../hooks/useTransferDuration'

const DAY_IN_MINUTES = 24 * 60
const HOUR_IN_MINUTES = 60

function mockTransactionObject({
  minutesSinceStart,
  isDeposit,
  isCctp,
  parentChainId,
  childChainId
}: {
  minutesSinceStart: number
  isDeposit: boolean
  isCctp: boolean
  parentChainId: number
  childChainId: number
}): MergedTransaction {
  return {
    sender: '',
    destination: '',
    direction: 'deposit',
    status: 'pending',
    createdAt: dayjs()
      .subtract(minutesSinceStart, 'minutes')
      // subtract extra 30 seconds to ensure returned minutes are always consistent
      .subtract(30, 'seconds')
      .valueOf(),
    resolvedAt: 0,
    txId: '',
    asset: 'ETH',
    assetType: AssetType.ETH,
    value: '1',
    uniqueId: null,
    isWithdrawal: !isDeposit,
    blockNum: 0,
    tokenAddress: '',
    isCctp,
    childChainId,
    parentChainId,
    sourceChainId: isDeposit ? parentChainId : childChainId,
    destinationChainId: isDeposit ? childChainId : parentChainId
  }
}

const renderHookAsyncUseTransferDuration = async (tx: MergedTransaction) => {
  let hook:
    | RenderHookResult<
        ReturnType<typeof useTransferDuration>,
        MergedTransaction
      >
    | undefined

  await act(async () => {
    hook = renderHook(() => useTransferDuration(tx))
  })

  if (!hook) {
    throw new Error('Hook is not defined')
  }

  return { result: hook.result }
}

describe('useTransferDuration', () => {
  // ========= DEPOSITS =========

  it('gets standard deposit duration for a new transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: true,
        isCctp: false,
        parentChainId: 1,
        childChainId: 42161
      })
    )

    expect(result.current.duration).toEqual(DEPOSIT_TIME_MINUTES_MAINNET)
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET
    )
    expect(result.current.remaining).toEqual(14)
  })

  it('gets standard deposit duration for an ongoing transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 8,
        isDeposit: true,
        isCctp: false,
        parentChainId: 1,
        childChainId: 42161
      })
    )

    expect(result.current.duration).toEqual(DEPOSIT_TIME_MINUTES_MAINNET)
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET
    )
    expect(result.current.remaining).toEqual(6)
  })

  it('gets standard deposit duration for a new transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: true,
        isCctp: false,
        parentChainId: 11155111,
        childChainId: 421614
      })
    )

    expect(result.current.duration).toEqual(DEPOSIT_TIME_MINUTES_TESTNET)
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET
    )
    expect(result.current.remaining).toEqual(9)
  })

  it('gets standard deposit duration for an ongoing transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 2,
        isDeposit: true,
        isCctp: false,
        parentChainId: 11155111,
        childChainId: 421614
      })
    )

    expect(result.current.duration).toEqual(DEPOSIT_TIME_MINUTES_TESTNET)
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET
    )
    expect(result.current.remaining).toEqual(7)
  })

  it('gets cctp deposit duration for a new transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: true,
        isCctp: true,
        parentChainId: 1,
        childChainId: 42161
      })
    )

    expect(result.current.duration).toEqual(TRANSFER_TIME_MINUTES_CCTP_MAINNET)
    expect(result.current.firstLegDuration).toEqual(
      TRANSFER_TIME_MINUTES_CCTP_MAINNET
    )
  })

  it('gets cctp deposit duration for a new transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: true,
        isCctp: true,
        parentChainId: 11155111,
        childChainId: 421614
      })
    )

    expect(result.current.duration).toEqual(TRANSFER_TIME_MINUTES_CCTP_TESTNET)
    expect(result.current.firstLegDuration).toEqual(
      TRANSFER_TIME_MINUTES_CCTP_TESTNET
    )
  })

  it('gets orbit deposit duration for a new transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: true,
        isCctp: false,
        parentChainId: 42161,
        childChainId: 660279
      })
    )

    expect(result.current.duration).toEqual(DEPOSIT_TIME_MINUTES_ORBIT_MAINNET)
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_ORBIT_MAINNET
    )
    expect(result.current.remaining).toEqual(4)
  })

  it('gets orbit deposit duration for an ongoing transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 3,
        isDeposit: true,
        isCctp: false,
        parentChainId: 42161,
        childChainId: 660279
      })
    )

    expect(result.current.duration).toEqual(DEPOSIT_TIME_MINUTES_ORBIT_MAINNET)
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_ORBIT_MAINNET
    )
    expect(result.current.remaining).toEqual(1)
  })

  it('gets orbit deposit duration for a new transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: true,
        isCctp: false,
        parentChainId: 421614,
        childChainId: 37714555429
      })
    )

    expect(result.current.duration).toEqual(DEPOSIT_TIME_MINUTES_ORBIT_TESTNET)
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_ORBIT_TESTNET
    )
    expect(result.current.remaining).toEqual(0)
  })

  it('gets orbit deposit duration for an ongoing transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 1,
        isDeposit: true,
        isCctp: false,
        parentChainId: 421614,
        childChainId: 37714555429
      })
    )

    expect(result.current.duration).toEqual(DEPOSIT_TIME_MINUTES_ORBIT_TESTNET)
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_ORBIT_TESTNET
    )
    expect(result.current.remaining).toEqual(0)
  })

  it('gets teleport duration for a new transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: true,
        isCctp: false,
        parentChainId: 1,
        childChainId: 1380012617
      })
    )

    expect(result.current.duration).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET + DEPOSIT_TIME_MINUTES_ORBIT_MAINNET
    )
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET
    )
    expect(result.current.remaining).toEqual(19)
  })

  it('gets teleport duration for an ongoing transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 11,
        isDeposit: true,
        isCctp: false,
        parentChainId: 1,
        childChainId: 1380012617
      })
    )

    expect(result.current.duration).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET + DEPOSIT_TIME_MINUTES_ORBIT_MAINNET
    )
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET
    )
    expect(result.current.remaining).toEqual(8)
  })

  it('gets teleport duration for a new transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: true,
        isCctp: false,
        parentChainId: 11155111,
        childChainId: 1918988905
      })
    )

    expect(result.current.duration).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET + DEPOSIT_TIME_MINUTES_ORBIT_TESTNET
    )
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET
    )
    expect(result.current.remaining).toEqual(10)
  })

  it('gets teleport duration for an ongoing transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 4,
        isDeposit: true,
        isCctp: false,
        parentChainId: 11155111,
        childChainId: 1918988905
      })
    )

    expect(result.current.duration).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET + DEPOSIT_TIME_MINUTES_ORBIT_TESTNET
    )
    expect(result.current.firstLegDuration).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET
    )
    expect(result.current.remaining).toEqual(6)
  })

  // ========= WITHDRAWALS =========

  it('gets standard withdrawal duration for a new transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: false,
        isCctp: false,
        parentChainId: 1,
        childChainId: 42161
      })
    )

    expect(result.current.duration).toBeGreaterThan(6 * DAY_IN_MINUTES)
    expect(result.current.firstLegDuration).toBeGreaterThan(6 * DAY_IN_MINUTES)
    expect(result.current.remaining).toBeGreaterThan(6 * DAY_IN_MINUTES)
  })

  it('gets standard withdrawal duration for an ongoing transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 3 * DAY_IN_MINUTES,
        isDeposit: false,
        isCctp: false,
        parentChainId: 1,
        childChainId: 42161
      })
    )

    expect(result.current.duration).toBeGreaterThan(6 * DAY_IN_MINUTES)
    expect(result.current.firstLegDuration).toBeGreaterThan(6 * DAY_IN_MINUTES)
    expect(result.current.remaining).toBeGreaterThan(3 * DAY_IN_MINUTES)
    expect(result.current.remaining).toBeLessThan(4 * DAY_IN_MINUTES)
  })

  it('gets standard withdrawal duration for a new transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: false,
        isCctp: false,
        parentChainId: 11155111,
        childChainId: 421614
      })
    )

    expect(result.current.duration).toBeGreaterThan(HOUR_IN_MINUTES)
    expect(result.current.firstLegDuration).toBeGreaterThan(HOUR_IN_MINUTES)
    expect(result.current.remaining).toBeGreaterThan(HOUR_IN_MINUTES)
  })

  it('gets standard withdrawal duration for an ongoing transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0.5 * HOUR_IN_MINUTES,
        isDeposit: false,
        isCctp: false,
        parentChainId: 11155111,
        childChainId: 421614
      })
    )

    expect(result.current.duration).toBeGreaterThan(HOUR_IN_MINUTES)
    expect(result.current.firstLegDuration).toBeGreaterThan(HOUR_IN_MINUTES)
    expect(result.current.remaining).toBeGreaterThan(0.3 * HOUR_IN_MINUTES)
    expect(result.current.remaining).toBeLessThan(0.7 * HOUR_IN_MINUTES)
  })

  it('gets cctp withdrawal duration for a new transfer on Mainnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: false,
        isCctp: true,
        parentChainId: 1,
        childChainId: 42161
      })
    )

    expect(result.current.duration).toEqual(TRANSFER_TIME_MINUTES_CCTP_MAINNET)
    expect(result.current.firstLegDuration).toEqual(
      TRANSFER_TIME_MINUTES_CCTP_MAINNET
    )
  })

  it('gets cctp withdrawal duration for a new transfer on Testnet', async () => {
    const { result } = await renderHookAsyncUseTransferDuration(
      mockTransactionObject({
        minutesSinceStart: 0,
        isDeposit: false,
        isCctp: true,
        parentChainId: 11155111,
        childChainId: 421614
      })
    )

    expect(result.current.duration).toEqual(TRANSFER_TIME_MINUTES_CCTP_TESTNET)
    expect(result.current.firstLegDuration).toEqual(
      TRANSFER_TIME_MINUTES_CCTP_TESTNET
    )
  })
})
