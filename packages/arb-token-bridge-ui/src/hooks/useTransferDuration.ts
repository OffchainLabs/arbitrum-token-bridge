import dayjs from 'dayjs'
import { isTeleport } from '@/token-bridge-sdk/teleport'

import { MergedTransaction } from '../state/app/state'
import { useRemainingTimeCctp } from '../state/cctpState'
import {
  getBaseChainIdByChainId,
  getConfirmPeriodBlocks,
  getL1BlockTime,
  isNetwork
} from '../util/networks'

const DEPOSIT_TIME_MINUTES_MAINNET = 15
const DEPOSIT_TIME_MINUTES_TESTNET = 10

const TRANSFER_TIME_MINUTES_CCTP_MAINNET = 15
const TRANSFER_TIME_MINUTES_CCTP_TESTNET = 1

/**
 * TODO: An assumption should be 15 minutes for mainnet orbit deposits
 * We should default to 15 and allow custom deposit times in orbit config (e.g. Xai should be 1 min)
 * For now set 5 minutes for mainnet, 1 minute for testnet
 */
const DEPOSIT_TIME_MINUTES_ORBIT_MAINNET = 5
const DEPOSIT_TIME_MINUTES_ORBIT_TESTNET = 1

/**
 * Buffer for after a node is confirmable but isn't yet confirmed.
 * A rollup block (RBlock) typically gets asserted every 30-60 minutes.
 */
const CONFIRMATION_BUFFER_MINUTES = 60
const SECONDS_IN_MIN = 60

type UseTransferDurationResult = {
  approximateDuration: number
  estimatedTimeLeft: number | null
}

/**
 * Calculates the transfer duration in minutes for a given transaction.
 *
 * @param {MergedTransaction} tx - The transaction object.
 * @returns {UseTransferDurationResult} - An object containing the total duration, first leg duration, and remaining time.
 * @property {number} approximateDuration - The total duration of the transfer in minutes.
 * @property {number | null} estimatedTimeLeft - The remaining time for the transfer in minutes, or null if calculating or unavailable.
 */
export const useTransferDuration = (
  tx: MergedTransaction
): UseTransferDurationResult => {
  const { estimatedTimeLeft: estimatedTimeLeftCctp } = useRemainingTimeCctp(tx)

  const { sourceChainId, destinationChainId, isCctp, childChainId } = tx
  const { isTestnet, isOrbitChain } = isNetwork(childChainId)

  const standardDepositDuration = getStandardDepositDuration(isTestnet)
  const orbitDepositDuration = getOrbitDepositDuration(isTestnet)

  if (isTeleport({ sourceChainId, destinationChainId })) {
    // Deposit only
    return {
      approximateDuration: standardDepositDuration + orbitDepositDuration,
      estimatedTimeLeft: getRemainingMinutes({
        createdAt: tx.createdAt,
        totalDuration: standardDepositDuration + orbitDepositDuration
      })
    }
  }

  if (isCctp) {
    const cctpTransferDuration = getCctpTransferDuration(isTestnet)
    return {
      approximateDuration: cctpTransferDuration,
      estimatedTimeLeft: estimatedTimeLeftCctp
    }
  }

  if (tx.isWithdrawal) {
    const withdrawalDuration = getWithdrawalDuration(tx)
    return {
      approximateDuration: withdrawalDuration,
      estimatedTimeLeft: getRemainingMinutes({
        createdAt: tx.createdAt,
        totalDuration: withdrawalDuration
      })
    }
  }

  if (isOrbitChain) {
    return {
      approximateDuration: orbitDepositDuration,
      estimatedTimeLeft: getRemainingMinutes({
        createdAt: tx.createdAt,
        totalDuration: orbitDepositDuration
      })
    }
  }

  return {
    approximateDuration: standardDepositDuration,
    estimatedTimeLeft: getRemainingMinutes({
      createdAt: tx.createdAt,
      totalDuration: standardDepositDuration
    })
  }
}

export function getWithdrawalConfirmationDate({
  createdAt,
  withdrawalFromChainId
}: {
  createdAt: number | null
  withdrawalFromChainId: number
}) {
  // For new txs createdAt won't be defined yet, we default to the current time in that case
  const createdAtDate = createdAt ? dayjs(createdAt) : dayjs()

  const baseChainId = getBaseChainIdByChainId({
    chainId: withdrawalFromChainId
  })
  // the block time is always base chain's block time regardless of withdrawing from L3 to L2 or from L2 to L1
  // and similarly, the confirm period blocks is always the number of blocks on the base chain
  const confirmationSeconds =
    getL1BlockTime(baseChainId) *
      getConfirmPeriodBlocks(withdrawalFromChainId) +
    CONFIRMATION_BUFFER_MINUTES * SECONDS_IN_MIN
  return createdAtDate.add(confirmationSeconds, 'second')
}

function getWithdrawalDuration(tx: MergedTransaction) {
  const confirmationDate = getWithdrawalConfirmationDate({
    createdAt: tx.createdAt,
    withdrawalFromChainId: tx.sourceChainId
  })
  return Math.max(confirmationDate.diff(tx.createdAt, 'minute'), 0)
}

export function getStandardDepositDuration(testnet: boolean) {
  return testnet ? DEPOSIT_TIME_MINUTES_TESTNET : DEPOSIT_TIME_MINUTES_MAINNET
}

export function getOrbitDepositDuration(testnet: boolean) {
  return testnet
    ? DEPOSIT_TIME_MINUTES_ORBIT_TESTNET
    : DEPOSIT_TIME_MINUTES_ORBIT_MAINNET
}

export function getCctpTransferDuration(testnet: boolean) {
  return testnet
    ? TRANSFER_TIME_MINUTES_CCTP_TESTNET
    : TRANSFER_TIME_MINUTES_CCTP_MAINNET
}

function getRemainingMinutes({
  createdAt,
  totalDuration
}: {
  createdAt: number | null
  totalDuration: number
}): number {
  // For new txs createdAt won't be defined yet, we default to the current time in that case
  const createdAtDate = createdAt ? dayjs(createdAt) : dayjs()
  const estimatedCompletionTime = createdAtDate.add(totalDuration, 'minutes')

  return Math.max(estimatedCompletionTime.diff(dayjs(), 'minute'), 0)
}

export function minutesToHumanReadableTime(minutes: number | null) {
  if (minutes === null) {
    return 'Calculating...'
  }
  if (minutes <= 0) {
    return 'Less than a minute'
  }
  // will convert number to '20 minutes', '1 hour', '7 days', etc
  return dayjs().add(minutes, 'minutes').fromNow(true)
}
