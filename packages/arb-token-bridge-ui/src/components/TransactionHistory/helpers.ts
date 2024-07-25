import dayjs from 'dayjs'
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import {
  EthDepositMessage,
  EthDepositMessageStatus,
  ParentToChildMessageStatus,
  ParentToChildMessageReader,
  ChildTransactionReceipt,
  ChildToParentTransactionEvent
} from '@arbitrum/sdk'

import {
  DepositStatus,
  MergedTransaction,
  WithdrawalStatus
} from '../../state/app/state'
import {
  ChainId,
  getL1BlockTime,
  isNetwork,
  rpcURLs
} from '../../util/networks'
import { Deposit, Transfer } from '../../hooks/useTransactionHistory'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import {
  getL1ToL2MessageDataFromL1TxHash,
  fetchTeleporterDepositStatusData
} from '../../util/deposits/helpers'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { getDepositStatus } from '../../state/app/utils'
import { getBlockBeforeConfirmation } from '../../state/cctpState'
import { getAttestationHashAndMessageFromReceipt } from '../../util/cctp/getAttestationHashAndMessageFromReceipt'
import { isTeleport } from '@/token-bridge-sdk/teleport'
import { getOutgoingMessageState } from '../../util/withdrawals/helpers'
import { getUniqueIdOrHashFromEvent } from '../../hooks/useArbTokenBridge'
import { getProviderForChainId } from '../../token-bridge-sdk/utils'

const PARENT_CHAIN_TX_DETAILS_OF_CLAIM_TX =
  'arbitrum:bridge:claim:parent:tx:details'
const DEPOSITS_LOCAL_STORAGE_KEY = 'arbitrum:bridge:deposits'

export enum StatusLabel {
  PENDING = 'Pending',
  CLAIMABLE = 'Claimable',
  SUCCESS = 'Success',
  EXPIRED = 'Expired',
  FAILURE = 'Failure'
}

function isDeposit(tx: MergedTransaction): boolean {
  return !tx.isWithdrawal
}

export function isCctpTransfer(tx: Transfer): tx is MergedTransaction {
  return (tx as MergedTransaction).isCctp === true
}

export function isTxCompleted(tx: MergedTransaction): boolean {
  if (tx.isCctp) {
    return typeof tx.cctpData?.receiveMessageTransactionHash === 'string'
  }
  if (isDeposit(tx)) {
    return tx.depositStatus === DepositStatus.L2_SUCCESS
  }
  return tx.status === WithdrawalStatus.EXECUTED
}

export function isTxPending(tx: MergedTransaction) {
  if (
    tx.isCctp &&
    (tx.status === WithdrawalStatus.UNCONFIRMED || tx.status === 'pending')
  ) {
    return true
  }
  if (isDeposit(tx)) {
    return (
      tx.depositStatus === DepositStatus.L1_PENDING ||
      tx.depositStatus === DepositStatus.L2_PENDING
    )
  }
  return tx.status === WithdrawalStatus.UNCONFIRMED
}

export function isTxClaimable(tx: MergedTransaction): boolean {
  if (isCctpTransfer(tx) && tx.status === 'Confirmed') {
    return true
  }
  if (isDeposit(tx)) {
    return false
  }
  return tx.status === WithdrawalStatus.CONFIRMED
}

export function isTxExpired(tx: MergedTransaction): boolean {
  if (isDeposit(tx)) {
    return tx.depositStatus === DepositStatus.EXPIRED
  }
  return tx.status === WithdrawalStatus.EXPIRED
}

export function isTxFailed(tx: MergedTransaction): boolean {
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

export function isSameTransaction(
  txDetails_1: {
    txId: string
    parentChainId: ChainId
    childChainId: ChainId
  },
  txDetails_2: {
    txId: string
    parentChainId: ChainId
    childChainId: ChainId
  }
) {
  return (
    txDetails_1.txId === txDetails_2.txId &&
    txDetails_1.parentChainId === txDetails_2.parentChainId &&
    txDetails_1.childChainId === txDetails_2.childChainId
  )
}

export function getTxReceipt(tx: MergedTransaction) {
  const parentChainProvider = getProviderForChainId(tx.parentChainId)
  const childChainProvider = getProviderForChainId(tx.childChainId)

  const provider = tx.isWithdrawal ? childChainProvider : parentChainProvider

  return provider.getTransactionReceipt(tx.txId)
}

async function getWithdrawalStatusFromEvents({
  withdrawalEvent,
  childChainId,
  parentChainProvider,
  childChainProvider
}: {
  withdrawalEvent: ChildToParentTransactionEvent
  parentChainProvider: Provider
  childChainProvider: Provider
  childChainId: ChainId
}): Promise<WithdrawalStatus | undefined> {
  const outgoingMessageState = await getOutgoingMessageState(
    withdrawalEvent,
    parentChainProvider,
    childChainProvider,
    childChainId
  )

  switch (outgoingMessageState) {
    case 0:
      return WithdrawalStatus.UNCONFIRMED
    case 1:
      return WithdrawalStatus.CONFIRMED
    case 2:
      return WithdrawalStatus.EXECUTED
    default:
      return undefined
  }
}

export function getDepositsWithoutStatusesFromCache(
  address: string | undefined
): Deposit[] {
  if (!address) {
    return []
  }
  return JSON.parse(
    localStorage.getItem(
      `${DEPOSITS_LOCAL_STORAGE_KEY}-${address.toLowerCase()}`
    ) ?? '[]'
  ) as Deposit[]
}

/**
 * Cache deposits from event logs. We don't fetch these so we need to store them locally.
 *
 * @param {MergedTransaction} tx - Deposit from event logs to be cached.
 */
export function addDepositToCache(tx: Deposit) {
  if (tx.direction !== 'deposit') {
    return
  }

  const cachedDeposits = getDepositsWithoutStatusesFromCache(
    tx.sender.toLowerCase()
  )

  const foundInCache = cachedDeposits.find(cachedTx =>
    isSameTransaction(
      { ...cachedTx, txId: cachedTx.txID },
      { ...tx, txId: tx.txID }
    )
  )

  if (foundInCache) {
    return
  }

  const newCachedDeposits = [tx, ...cachedDeposits]

  localStorage.setItem(
    `${DEPOSITS_LOCAL_STORAGE_KEY}-${tx.sender.toLowerCase()}`,
    JSON.stringify(newCachedDeposits)
  )
}

/**
 * Cache parent chain tx details when claiming. This is the chain the funds were claimed on. We store locally because we don't have access to this tx from the child chain tx data.
 *
 * @param {MergedTransaction} tx - Transaction that initiated the withdrawal (child chain transaction).
 * @param {string} parentChainTxId - Transaction ID of the claim transaction (parent chain transaction ID).
 */
export function setParentChainTxDetailsOfWithdrawalClaimTx(
  tx: MergedTransaction,
  parentChainTxId: string
) {
  const key = `${tx.parentChainId}-${tx.childChainId}-${tx.txId}`

  const cachedClaimParentChainTxId = JSON.parse(
    localStorage.getItem(PARENT_CHAIN_TX_DETAILS_OF_CLAIM_TX) ?? '{}'
  )

  if (key in cachedClaimParentChainTxId) {
    // already set
    return
  }

  localStorage.setItem(
    PARENT_CHAIN_TX_DETAILS_OF_CLAIM_TX,
    JSON.stringify({
      ...cachedClaimParentChainTxId,
      [key]: {
        txId: parentChainTxId,
        timestamp: dayjs().valueOf()
      }
    })
  )
}

export function getWithdrawalClaimParentChainTxDetails(
  tx: MergedTransaction
): { txId: string; timestamp: number } | undefined {
  if (!tx.isWithdrawal || tx.isCctp) {
    return undefined
  }

  const key = `${tx.parentChainId}-${tx.childChainId}-${tx.txId}`

  const cachedClaimParentChainTxDetails = (
    JSON.parse(
      localStorage.getItem(PARENT_CHAIN_TX_DETAILS_OF_CLAIM_TX) ?? '{}'
    ) as {
      [key in string]: {
        txId: string
        timestamp: number
      }
    }
  )[key]

  return cachedClaimParentChainTxDetails
}

export async function getUpdatedEthDeposit(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  if (
    !isTxPending(tx) ||
    tx.assetType !== AssetType.ETH ||
    tx.isWithdrawal ||
    tx.isCctp
  ) {
    return tx
  }

  const { l1ToL2Msg } = await getL1ToL2MessageDataFromL1TxHash({
    depositTxId: tx.txId,
    isEthDeposit: true,
    l1Provider: getProviderForChainId(tx.parentChainId),
    l2Provider: getProviderForChainId(tx.childChainId)
  })

  if (!l1ToL2Msg) {
    const receipt = await getTxReceipt(tx)

    if (!receipt || receipt.status !== 0) {
      // not failure
      return tx
    }

    // failure
    return { ...tx, status: 'failure', depositStatus: DepositStatus.L1_FAILURE }
  }

  const status = await l1ToL2Msg?.status()
  const isDeposited = status === EthDepositMessageStatus.DEPOSITED

  const newDeposit: MergedTransaction = {
    ...tx,
    status: 'success',
    resolvedAt: isDeposited ? dayjs().valueOf() : null,
    l1ToL2MsgData: {
      fetchingUpdate: false,
      status: isDeposited
        ? ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD
        : ParentToChildMessageStatus.NOT_YET_CREATED,
      retryableCreationTxID: (l1ToL2Msg as EthDepositMessage).childTxHash,
      // Only show `l2TxID` after the deposit is confirmed
      l2TxID: isDeposited
        ? (l1ToL2Msg as EthDepositMessage).childTxHash
        : undefined
    }
  }

  return {
    ...newDeposit,
    depositStatus: getDepositStatus(newDeposit)
  }
}

export async function getUpdatedTokenDeposit(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  if (
    !isTxPending(tx) ||
    tx.assetType !== AssetType.ERC20 ||
    tx.isWithdrawal ||
    tx.isCctp
  ) {
    return tx
  }

  const { l1ToL2Msg } = await getL1ToL2MessageDataFromL1TxHash({
    depositTxId: tx.txId,
    isEthDeposit: false,
    l1Provider: getProviderForChainId(tx.parentChainId),
    l2Provider: getProviderForChainId(tx.childChainId)
  })
  const _l1ToL2Msg = l1ToL2Msg as ParentToChildMessageReader

  if (!l1ToL2Msg) {
    const receipt = await getTxReceipt(tx)

    if (!receipt || receipt.status !== 0) {
      // not failure
      return tx
    }

    // failure
    return { ...tx, status: 'failure', depositStatus: DepositStatus.L1_FAILURE }
  }

  const res = await _l1ToL2Msg.getSuccessfulRedeem()

  const l2TxID = (() => {
    if (res.status === ParentToChildMessageStatus.REDEEMED) {
      return res.childTxReceipt.transactionHash
    } else {
      return undefined
    }
  })()

  const newDeposit: MergedTransaction = {
    ...tx,
    status: _l1ToL2Msg.retryableCreationId ? 'success' : tx.status,
    resolvedAt:
      res.status === ParentToChildMessageStatus.REDEEMED
        ? dayjs().valueOf()
        : null,
    l1ToL2MsgData: {
      status: res.status,
      l2TxID,
      fetchingUpdate: false,
      retryableCreationTxID: _l1ToL2Msg.retryableCreationId
    }
  }

  return {
    ...newDeposit,
    depositStatus: getDepositStatus(newDeposit)
  }
}

export async function getUpdatedWithdrawal(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  if (!isTxPending(tx) || !tx.isWithdrawal || tx.isCctp) {
    return tx
  }

  const parentChainProvider = getProviderForChainId(tx.parentChainId)
  const childChainProvider = getProviderForChainId(tx.childChainId)
  const txReceipt = await getTxReceipt(tx)
  const childTxReceipt = new ChildTransactionReceipt(txReceipt)
  const [withdrawalEvent] = await childTxReceipt.getChildToParentEvents()

  if (childTxReceipt) {
    const newStatus = withdrawalEvent
      ? await getWithdrawalStatusFromEvents({
          withdrawalEvent,
          childChainId: tx.childChainId,
          parentChainProvider,
          childChainProvider
        })
      : undefined

    // unique id for withdrawal event is required for claiming, if the new status changes to confirmed
    const uniqueId = withdrawalEvent
      ? getUniqueIdOrHashFromEvent(withdrawalEvent)
      : null

    if (typeof newStatus !== 'undefined') {
      return {
        ...tx,
        uniqueId,
        status: newStatus
      }
    }
  }

  return tx
}

export async function getUpdatedCctpTransfer(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  if (!isTxPending(tx) || !tx.isCctp) {
    return tx
  }

  const receipt = await getTxReceipt(tx)

  if (!receipt) {
    return tx
  }

  const requiredL1BlocksBeforeConfirmation = getBlockBeforeConfirmation(
    tx.parentChainId
  )
  const blockTime = getL1BlockTime(tx.parentChainId)

  const txWithTxId: MergedTransaction = { ...tx, txId: receipt.transactionHash }

  if (receipt.status === 0) {
    return {
      ...txWithTxId,
      status: WithdrawalStatus.FAILURE
    }
  }
  if (tx.cctpData?.receiveMessageTransactionHash) {
    return {
      ...txWithTxId,
      status: WithdrawalStatus.EXECUTED
    }
  }
  if (receipt.blockNumber && !tx.blockNum) {
    // If blockNumber was never set (for example, network switch just after the deposit)
    const { messageBytes, attestationHash } =
      getAttestationHashAndMessageFromReceipt(receipt)
    return {
      ...txWithTxId,
      blockNum: receipt.blockNumber,
      cctpData: {
        ...tx.cctpData,
        messageBytes,
        attestationHash
      }
    }
  }
  const isConfirmed =
    tx.createdAt &&
    dayjs().diff(tx.createdAt, 'second') >
      requiredL1BlocksBeforeConfirmation * blockTime
  if (
    // If transaction claim was set to failure, don't reset to Confirmed
    tx.status !== WithdrawalStatus.FAILURE &&
    isConfirmed
  ) {
    return {
      ...txWithTxId,
      status: WithdrawalStatus.CONFIRMED
    }
  }

  return { ...tx, status: WithdrawalStatus.UNCONFIRMED }
}

export async function getUpdatedTeleportTransfer(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  const { status, timestampResolved, l1ToL2MsgData, l2ToL3MsgData } =
    await fetchTeleporterDepositStatusData(tx)

  const updatedTx = {
    ...tx,
    status,
    timestampResolved,
    l1ToL2MsgData,
    l2ToL3MsgData
  }

  return {
    ...updatedTx,
    depositStatus: getDepositStatus(updatedTx)
  }
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
  return 'less than a minute'
}

export function getDestinationNetworkTxId(tx: MergedTransaction) {
  if (tx.isCctp) {
    return tx.cctpData?.receiveMessageTransactionHash
  }

  if (isTeleport(tx)) {
    return tx.l2ToL3MsgData?.l3TxID
  }

  return tx.isWithdrawal
    ? tx.l2ToL1MsgData?.uniqueId.toString()
    : tx.l1ToL2MsgData?.l2TxID
}
