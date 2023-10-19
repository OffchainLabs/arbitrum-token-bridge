import { DepositStatus, MergedTransaction } from '../../state/app/state'

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
  return tx.status === 'Success'
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
      case 'Executed':
        return StatusLabel.SUCCESS
      case 'Confirmed':
        return StatusLabel.CLAIMABLE
      case 'Unconfirmed':
        return StatusLabel.PENDING
      default:
        return StatusLabel.FAILURE
    }
  }
}
