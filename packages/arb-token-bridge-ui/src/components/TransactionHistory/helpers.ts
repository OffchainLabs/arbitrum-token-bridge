import dayjs from 'dayjs'
import {
  DepositStatus,
  MergedTransaction,
  WithdrawalStatus
} from '../../state/app/state'
import { isNetwork } from '../../util/networks'

export enum StatusLabel {
  PENDING = 'Pending',
  CLAIMABLE = 'Claimable',
  SUCCESS = 'Success',
  EXPIRED = 'Expired',
  FAILURE = 'Failure'
}

function isDeposit(tx: MergedTransaction) {
  return !tx.isWithdrawal
}

export function isTxCompleted(tx: MergedTransaction) {
  if (isDeposit(tx)) {
    return tx.depositStatus === DepositStatus.L2_SUCCESS
  }
  return tx.status === WithdrawalStatus.EXECUTED
}

export function isTxPending(tx: MergedTransaction) {
  if (isDeposit(tx)) {
    return (
      tx.depositStatus === DepositStatus.L1_PENDING ||
      tx.depositStatus === DepositStatus.L2_PENDING
    )
  }
  return tx.status === WithdrawalStatus.UNCONFIRMED
}

export function isTxClaimable(tx: MergedTransaction) {
  if (isDeposit(tx)) {
    return false
  }
  return tx.status === WithdrawalStatus.CONFIRMED
}

export function isTxExpired(tx: MergedTransaction) {
  if (isDeposit(tx)) {
    return tx.depositStatus === DepositStatus.EXPIRED
  }
  return tx.status === WithdrawalStatus.EXPIRED
}

export function isTxFailed(tx: MergedTransaction) {
  if (isDeposit(tx)) {
    if (!tx.depositStatus) {
      return false
    }
    return [
      DepositStatus.CREATION_FAILED,
      DepositStatus.L1_FAILURE,
      DepositStatus.L2_FAILURE
    ].includes(tx.depositStatus)
  }
  return tx.status === WithdrawalStatus.FAILURE
}

export function getSourceChainId(tx: MergedTransaction) {
  return isDeposit(tx) ? tx.parentChainId : tx.chainId
}

export function getDestChainId(tx: MergedTransaction) {
  return isDeposit(tx) ? tx.chainId : tx.parentChainId
}

export function getTxStatusLabel(tx: MergedTransaction): StatusLabel {
  if (isDeposit(tx)) {
    switch (tx.depositStatus) {
      case DepositStatus.CREATION_FAILED:
      case DepositStatus.L1_FAILURE:
      case DepositStatus.L2_FAILURE:
        return StatusLabel.FAILURE
      case DepositStatus.EXPIRED:
        return StatusLabel.EXPIRED
      case DepositStatus.L1_PENDING:
      case DepositStatus.L2_PENDING:
        return StatusLabel.PENDING
      default:
        return StatusLabel.SUCCESS
    }
  } else {
    switch (tx.status) {
      case WithdrawalStatus.EXECUTED:
        return StatusLabel.SUCCESS
      case WithdrawalStatus.CONFIRMED:
        return StatusLabel.CLAIMABLE
      case WithdrawalStatus.UNCONFIRMED:
        return StatusLabel.PENDING
      default:
        return StatusLabel.FAILURE
    }
  }
}

function getTxDurationInMinutes(tx: MergedTransaction) {
  const { parentChainId } = tx
  const { isEthereumMainnet, isEthereumMainnetOrTestnet, isTestnet } =
    isNetwork(parentChainId)

  if (isDeposit(tx)) {
    if (!isEthereumMainnetOrTestnet) {
      return 1
    }

    return isTestnet ? 10 : 15
  }

  // Withdrawals
  const SEVEN_DAYS_IN_MINUTES = 7 * 24 * 60

  if (isEthereumMainnet) {
    return SEVEN_DAYS_IN_MINUTES
  }

  // Node is created every ~1h for all other chains
  return 60
}

export function getTxRemainingTimeInMinutes(tx: MergedTransaction) {
  const now = dayjs()
  const { createdAt } = tx

  if (!isTxPending(tx)) {
    return null
  }

  // For new txs createdAt won't be defined yet, we default to the current time in that case
  const createdAtDate = createdAt ? dayjs(createdAt) : dayjs()
  const CONFIRMATION_BUFFER_MINUTES = isDeposit(tx) ? 0 : 30

  return Math.max(
    getTxDurationInMinutes(tx) -
      now.diff(createdAtDate, 'minutes') +
      CONFIRMATION_BUFFER_MINUTES,
    0
  )
}

export function getTxCompletionDate(tx: MergedTransaction) {
  const minutesLeft = getTxRemainingTimeInMinutes(tx)
  const { createdAt, resolvedAt } = tx

  if (typeof minutesLeft !== 'number' || !createdAt) {
    return null
  }

  if (!isTxPending(tx)) {
    return resolvedAt ? dayjs(resolvedAt) : null
  }

  return dayjs(createdAt).add(minutesLeft, 'minutes')
}

export function getTxHumanReadableRemainingTime(tx: MergedTransaction) {
  const minutesLeft = getTxRemainingTimeInMinutes(tx)

  if (!minutesLeft) {
    return null
  }

  const hoursLeft = Math.floor(minutesLeft / 60)
  const daysLeft = Math.floor(hoursLeft / 24)

  const formattedDaysLeft = daysLeft === 1 ? '1 day' : `${daysLeft} days`
  const formattedHoursLeft = hoursLeft === 1 ? '1 hr' : `${daysLeft} hrs`
  const formattedMinutesLeft =
    minutesLeft === 1 ? '1 min' : `${minutesLeft} mins`

  if (daysLeft > 0) {
    return `${formattedDaysLeft} ${hoursLeft % 60}${
      hoursLeft % 60 === 1 ? ' hr' : ' hrs'
    }`
  }
  if (hoursLeft > 0) {
    return `${formattedHoursLeft} ${minutesLeft % 60}${
      minutesLeft % 60 === 1 ? ' min' : ' mins'
    }`
  }
  if (minutesLeft > 0) {
    return formattedMinutesLeft
  }
  return 'Almost there...'
}
