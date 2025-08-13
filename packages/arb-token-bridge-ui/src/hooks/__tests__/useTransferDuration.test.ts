import dayjs from 'dayjs'
import { describe, beforeAll, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'
import { MergedTransaction } from '../../state/app/state'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import {
  getCctpTransferDuration,
  getOrbitDepositDuration,
  getStandardDepositDuration,
  useTransferDuration
} from '../../hooks/useTransferDuration'
import { getOrbitChains } from '../../util/orbitChainsList'

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
  const hook = renderHook(() => useTransferDuration(tx))
  return { result: hook.result }
}

describe('useTransferDuration', () => {
  const DEPOSIT_TIME_MINUTES_MAINNET = getStandardDepositDuration(false)
  const DEPOSIT_TIME_MINUTES_TESTNET = getStandardDepositDuration(true)
  const DEPOSIT_TIME_MINUTES_ORBIT_MAINNET = getOrbitDepositDuration(false)
  const DEPOSIT_TIME_MINUTES_ORBIT_TESTNET = getOrbitDepositDuration(true)
  const TRANSFER_TIME_MINUTES_CCTP_MAINNET = getCctpTransferDuration(false)
  const TRANSFER_TIME_MINUTES_CCTP_TESTNET = getCctpTransferDuration(true)

  beforeAll(() => {
    function resetAllChains() {
      // register all chains so we can read `isTestnet`
      getOrbitChains().forEach(chain => registerCustomArbitrumNetwork(chain))
    }

    expect(() => resetAllChains()).not.toThrow()
  })

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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(14)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(6)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(9)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(7)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
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

    expect(result.current.approximateDurationInMinutes).toEqual(
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_ORBIT_MAINNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(4)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_ORBIT_MAINNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(1)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_ORBIT_TESTNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(0)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_ORBIT_TESTNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(0)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET + DEPOSIT_TIME_MINUTES_ORBIT_MAINNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(19)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_MAINNET + DEPOSIT_TIME_MINUTES_ORBIT_MAINNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(8)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET + DEPOSIT_TIME_MINUTES_ORBIT_TESTNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(10)
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      DEPOSIT_TIME_MINUTES_TESTNET + DEPOSIT_TIME_MINUTES_ORBIT_TESTNET
    )
    expect(result.current.estimatedMinutesLeft).toEqual(6)
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

    expect(result.current.approximateDurationInMinutes).toBeGreaterThan(
      6 * DAY_IN_MINUTES
    )
    expect(result.current.estimatedMinutesLeft).toBeGreaterThan(
      6 * DAY_IN_MINUTES
    )
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

    expect(result.current.approximateDurationInMinutes).toBeGreaterThan(
      6 * DAY_IN_MINUTES
    )
    expect(result.current.estimatedMinutesLeft).toBeGreaterThan(
      3 * DAY_IN_MINUTES
    )
    expect(result.current.estimatedMinutesLeft).toBeLessThan(4 * DAY_IN_MINUTES)
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

    expect(result.current.approximateDurationInMinutes).toBeGreaterThan(
      HOUR_IN_MINUTES
    )
    expect(result.current.estimatedMinutesLeft).toBeGreaterThan(HOUR_IN_MINUTES)
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

    expect(result.current.approximateDurationInMinutes).toBeGreaterThan(
      HOUR_IN_MINUTES
    )
    expect(result.current.estimatedMinutesLeft).toBeGreaterThan(
      0.3 * HOUR_IN_MINUTES
    )
    expect(result.current.estimatedMinutesLeft).toBeLessThan(
      0.7 * HOUR_IN_MINUTES
    )
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

    expect(result.current.approximateDurationInMinutes).toEqual(
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

    expect(result.current.approximateDurationInMinutes).toEqual(
      TRANSFER_TIME_MINUTES_CCTP_TESTNET
    )
  })
})
