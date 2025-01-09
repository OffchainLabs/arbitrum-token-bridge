import dayjs from 'dayjs'
import { isValidTeleportChainPair } from '@/token-bridge-sdk/teleport'

import { MergedTransaction } from '../state/app/state'
import { useRemainingTimeCctp } from '../state/cctpState'
import { isNetwork } from '../util/networks'
import { getConfirmationTime } from '../util/WithdrawalUtils'

const DEPOSIT_TIME_MINUTES = {
  mainnet: 15,
  testnet: 10
}

const TRANSFER_TIME_MINUTES_CCTP = {
  mainnet: 15,
  testnet: 1
}

/**
 * TODO: An assumption should be 15 minutes for mainnet orbit deposits
 * We should default to 15 and allow custom deposit times in orbit config (e.g. Xai should be 1 min)
 * For now set 5 minutes for mainnet, 1 minute for testnet
 */
const DEPOSIT_TIME_MINUTES_ORBIT = {
  mainnet: 5,
  testnet: 1
}

type UseTransferDurationResult = {
  approximateDurationInMinutes: number
  estimatedMinutesLeft: number | null
}

/**
 * Calculates the transfer duration in minutes for a given transaction.
 *
 * @param {MergedTransaction} tx - The transaction object.
 * @returns {UseTransferDurationResult} - An object containing the total duration, first leg duration, and remaining time.
 * @property {number} approximateDurationInMinutes - The total duration of the transfer in minutes.
 * @property {number | null} estimatedMinutesLeft - The remaining time for the transfer in minutes, or null if calculating or unavailable.
 */
export const useTransferDuration = (
  tx: MergedTransaction
): UseTransferDurationResult => {
  const { estimatedMinutesLeftCctp } = useRemainingTimeCctp(tx)

  const { sourceChainId, destinationChainId, isCctp, childChainId } = tx
  const { isTestnet, isOrbitChain } = isNetwork(childChainId)

  const standardDepositDuration = getStandardDepositDuration(isTestnet)
  const orbitDepositDuration = getOrbitDepositDuration(isTestnet)

  if (isValidTeleportChainPair({ sourceChainId, destinationChainId })) {
    // Deposit only
    return {
      approximateDurationInMinutes:
        standardDepositDuration + orbitDepositDuration,
      estimatedMinutesLeft: getRemainingMinutes({
        createdAt: tx.createdAt,
        totalDuration: standardDepositDuration + orbitDepositDuration
      })
    }
  }

  if (isCctp) {
    const cctpTransferDuration = getCctpTransferDuration(isTestnet)
    return {
      approximateDurationInMinutes: cctpTransferDuration,
      estimatedMinutesLeft: estimatedMinutesLeftCctp
    }
  }

  if (tx.isWithdrawal) {
    const withdrawalDuration = getWithdrawalDuration(tx)
    return {
      approximateDurationInMinutes: withdrawalDuration,
      estimatedMinutesLeft: getRemainingMinutes({
        createdAt: tx.createdAt,
        totalDuration: withdrawalDuration
      })
    }
  }

  if (isOrbitChain) {
    return {
      approximateDurationInMinutes: orbitDepositDuration,
      estimatedMinutesLeft: getRemainingMinutes({
        createdAt: tx.createdAt,
        totalDuration: orbitDepositDuration
      })
    }
  }

  return {
    approximateDurationInMinutes: standardDepositDuration,
    estimatedMinutesLeft: getRemainingMinutes({
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

  const { confirmationTimeInSeconds } = getConfirmationTime(
    withdrawalFromChainId
  )
  return createdAtDate.add(confirmationTimeInSeconds, 'second')
}

function getWithdrawalDuration(tx: MergedTransaction) {
  const confirmationDate = getWithdrawalConfirmationDate({
    createdAt: tx.createdAt,
    withdrawalFromChainId: tx.sourceChainId
  })
  return Math.max(confirmationDate.diff(tx.createdAt, 'minute'), 0)
}

export function getStandardDepositDuration(testnet: boolean) {
  return testnet ? DEPOSIT_TIME_MINUTES.testnet : DEPOSIT_TIME_MINUTES.mainnet
}

export function getOrbitDepositDuration(testnet: boolean) {
  return testnet
    ? DEPOSIT_TIME_MINUTES_ORBIT.testnet
    : DEPOSIT_TIME_MINUTES_ORBIT.mainnet
}

export function getCctpTransferDuration(testnet: boolean) {
  return testnet
    ? TRANSFER_TIME_MINUTES_CCTP.testnet
    : TRANSFER_TIME_MINUTES_CCTP.mainnet
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
