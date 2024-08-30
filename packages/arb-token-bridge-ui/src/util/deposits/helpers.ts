import {
  ParentTransactionReceipt,
  ParentToChildMessageStatus,
  EthDepositMessage,
  EthDepositMessageStatus,
  ParentToChildMessageReader,
  ParentToChildMessageReaderClassic,
  EthL1L3DepositStatus,
  Erc20L1L3DepositStatus
} from '@arbitrum/sdk'
import { utils } from 'ethers'

import { Provider, TransactionReceipt } from '@ethersproject/providers'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import {
  ParentToChildMessageData,
  L2ToL3MessageData,
  Transaction,
  TxnStatus,
  TeleporterTransaction
} from '../../hooks/useTransactions'
import { fetchErc20Data } from '../TokenUtils'
import {
  getL2ConfigForTeleport,
  fetchTeleportStatusFromTxId,
  isTeleport
} from '../../token-bridge-sdk/teleport'
import { getProviderForChainId } from '../../token-bridge-sdk/utils'

export const updateAdditionalDepositData = async ({
  depositTx,
  parentProvider,
  childProvider
}: {
  depositTx: Transaction
  parentProvider: Provider
  childProvider: Provider
}): Promise<Transaction | TeleporterTransaction> => {
  // 1. for all the fetched txns, fetch the transaction receipts and update their exact status
  // 2. on the basis of those, finally calculate the status of the transaction

  // fetch timestamp creation date
  let timestampCreated = new Date().toISOString()
  if (depositTx.timestampCreated) {
    // if timestamp is already there in Subgraphs, take it from there
    timestampCreated = String(Number(depositTx.timestampCreated) * 1000)
  } else if (depositTx.blockNumber) {
    // if timestamp not in subgraph, fallback to onchain data
    timestampCreated = String(
      (await parentProvider.getBlock(depositTx.blockNumber)).timestamp * 1000
    )
  }

  // there are scenarios where we will return the deposit tx early
  // we need to make sure it has the updated timestamp no matter what
  depositTx.timestampCreated = timestampCreated

  const { isClassic } = depositTx // isClassic is known before-hand from subgraphs

  const isEthDeposit = depositTx.assetType === AssetType.ETH

  const { parentToChildMsg } =
    await getParentToChildMessageDataFromParentTxHash({
      depositTxId: depositTx.txID,
      parentProvider,
      childProvider,
      isEthDeposit,
      isClassic
    })

  if (
    isTeleport({
      sourceChainId: depositTx.parentChainId,
      destinationChainId: depositTx.childChainId
    })
  ) {
    const { status, timestampResolved, l1ToL2MsgData, l2ToL3MsgData } =
      await fetchTeleporterDepositStatusData({
        ...depositTx,
        txId: depositTx.txID,
        sourceChainId: depositTx.parentChainId,
        destinationChainId: depositTx.childChainId
      })

    return {
      ...depositTx,
      status,
      timestampResolved,
      parentToChildMsgData: l1ToL2MsgData,
      l2ToL3MsgData
    }
  }

  if (isClassic) {
    return updateClassicDepositStatusData({
      depositTx,
      parentToChildMsg: parentToChildMsg as ParentToChildMessageReaderClassic,
      isEthDeposit,
      timestampCreated,
      childProvider
    })
  }

  // Check if deposit is ETH
  if (isEthDeposit) {
    return updateETHDepositStatusData({
      depositTx,
      ethDepositMessage: parentToChildMsg as EthDepositMessage,
      childProvider,
      timestampCreated
    })
  }

  // ERC-20 deposit
  const tokenDeposit = await updateTokenDepositStatusData({
    depositTx,
    parentToChildMsg: parentToChildMsg as ParentToChildMessageReader,
    timestampCreated,
    parentProvider,
    childProvider
  })

  // check local storage first, fallback to fetching on chain
  if (depositTx.value2) {
    return { ...tokenDeposit, value2: depositTx.value2 }
  }

  const { value2 } = await getBatchTransferDepositData({
    l1ToL2Msg: parentToChildMsg as ParentToChildMessageReader,
    depositStatus: tokenDeposit.status
  })

  return {
    ...tokenDeposit,
    value2
  }
}

const getBatchTransferDepositData = async ({
  l1ToL2Msg,
  depositStatus
}: {
  l1ToL2Msg: ParentToChildMessageReader
  depositStatus: TxnStatus | undefined
}): Promise<{
  value2: Transaction['value2']
}> => {
  if (!isPotentialBatchTransfer({ l1ToL2Msg })) {
    return { value2: undefined }
  }

  // get maxSubmissionCost, which is the amount of ETH sent in batched ERC-20 deposit + max gas cost
  const maxSubmissionCost = Number(
    utils.formatEther(l1ToL2Msg.messageData.maxSubmissionFee.toString())
  )

  // we deduct gas cost from max submission fee, which leaves us with amount2 (extra ETH sent with ERC-20)
  if (depositStatus === 'success') {
    // if success, we use the actual gas cost
    const retryableFee = await getRetryableFee({
      l1ToL2Msg
    })

    if (!retryableFee) {
      return { value2: undefined }
    }

    return { value2: String(Number(maxSubmissionCost) - Number(retryableFee)) }
  }

  // when not success, we don't know the final gas cost yet so we use estimates
  const estimatedRetryableFee = utils.formatEther(
    l1ToL2Msg.messageData.gasLimit.mul(l1ToL2Msg.messageData.maxFeePerGas)
  )

  return {
    value2: String(Number(maxSubmissionCost) - Number(estimatedRetryableFee))
  }
}

const isPotentialBatchTransfer = ({
  l1ToL2Msg
}: {
  l1ToL2Msg: ParentToChildMessageReader
}) => {
  const { maxSubmissionFee, gasLimit, maxFeePerGas } = l1ToL2Msg.messageData

  const estimatedGas = gasLimit.mul(maxFeePerGas)

  const maxSubmissionFeeNumber = Number(utils.formatEther(maxSubmissionFee))
  const estimatedGasNumber = Number(utils.formatEther(estimatedGas))

  const excessGasFee = maxSubmissionFeeNumber - estimatedGasNumber
  const percentageGasUsed = (estimatedGasNumber / maxSubmissionFeeNumber) * 100

  // heuristic for determining if it's a batch transfer (based on maxSubmissionFee)
  return excessGasFee >= 0.001 && percentageGasUsed < 10
}

const getRetryableFee = async ({
  l1ToL2Msg
}: {
  l1ToL2Msg: ParentToChildMessageReader
}) => {
  const autoRedeemReceipt = (
    (await l1ToL2Msg.getSuccessfulRedeem()) as {
      status: ParentToChildMessageStatus.REDEEMED
      childTxReceipt: TransactionReceipt
    }
  ).childTxReceipt

  if (!autoRedeemReceipt) {
    return undefined
  }

  const autoRedeemGas = autoRedeemReceipt.gasUsed.mul(
    autoRedeemReceipt.effectiveGasPrice
  )

  const retryableCreationReceipt = await l1ToL2Msg.getRetryableCreationReceipt()

  if (!retryableCreationReceipt) {
    return undefined
  }

  const retryableCreationGas = retryableCreationReceipt.gasUsed.mul(
    retryableCreationReceipt.effectiveGasPrice
  )

  const gasUsed = autoRedeemGas.add(retryableCreationGas)

  return utils.formatEther(gasUsed)
}

const updateETHDepositStatusData = async ({
  depositTx,
  ethDepositMessage,
  childProvider,
  timestampCreated
}: {
  depositTx: Transaction
  ethDepositMessage: EthDepositMessage
  timestampCreated: string
  childProvider: Provider
}): Promise<Transaction> => {
  // from the eth-deposit-message, extract more things like retryableCreationTxID, status, etc

  if (!ethDepositMessage) return depositTx

  const status = await ethDepositMessage.status()
  const isDeposited = status === EthDepositMessageStatus.DEPOSITED

  const retryableCreationTxID = ethDepositMessage.childTxHash

  const childBlockNum = isDeposited
    ? (await childProvider.getTransaction(retryableCreationTxID)).blockNumber
    : null

  const timestampResolved = childBlockNum
    ? (await childProvider.getBlock(childBlockNum)).timestamp * 1000
    : null

  // return the data to populate on UI
  const updatedDepositTx: Transaction = {
    ...depositTx,
    status: retryableCreationTxID ? 'success' : 'pending',
    timestampCreated,
    timestampResolved: timestampResolved
      ? String(timestampResolved)
      : undefined,
    parentToChildMsgData: {
      status: isDeposited
        ? ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD
        : ParentToChildMessageStatus.NOT_YET_CREATED,
      retryableCreationTxID,
      // Only show `childTxId` after the deposit is confirmed
      childTxId: isDeposited ? ethDepositMessage.childTxHash : undefined,
      fetchingUpdate: false
    }
  }

  return updatedDepositTx
}

const updateTokenDepositStatusData = async ({
  depositTx,
  parentToChildMsg,
  timestampCreated,
  parentProvider,
  childProvider
}: {
  depositTx: Transaction
  timestampCreated: string
  parentProvider: Provider
  childProvider: Provider
  parentToChildMsg: ParentToChildMessageReader
}): Promise<Transaction> => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated
  }

  // fallback to on-chain token information if subgraph doesn't have it
  const { tokenAddress, assetName } = updatedDepositTx
  if (!assetName && tokenAddress) {
    const { symbol } = await fetchErc20Data({
      address: tokenAddress,
      provider: parentProvider
    })
    updatedDepositTx.assetName = symbol
  }

  if (!parentToChildMsg) return updatedDepositTx

  // get the status data of `parentToChildMsg`, if it is redeemed - `getSuccessfulRedeem` also returns its l2TxReceipt
  const res = await parentToChildMsg.getSuccessfulRedeem()

  const childTxId =
    res.status === ParentToChildMessageStatus.REDEEMED
      ? res.childTxReceipt.transactionHash
      : undefined

  const parentToChildMsgData = {
    status: res.status,
    childTxId,
    fetchingUpdate: false,
    retryableCreationTxID: parentToChildMsg.retryableCreationId
  }

  const isDeposited =
    parentToChildMsgData.status === ParentToChildMessageStatus.REDEEMED

  const childBlockNum = isDeposited
    ? (await childProvider.getTransaction(parentToChildMsg.retryableCreationId))
        .blockNumber
    : null

  const timestampResolved = childBlockNum
    ? (await childProvider.getBlock(childBlockNum)).timestamp * 1000
    : null

  const completeDepositTx: Transaction = {
    ...updatedDepositTx,
    status: parentToChildMsg.retryableCreationId ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved: timestampResolved
      ? String(timestampResolved)
      : undefined,
    parentToChildMsgData
  }

  return completeDepositTx
}

const updateClassicDepositStatusData = async ({
  depositTx,
  parentToChildMsg,
  isEthDeposit,
  timestampCreated,
  childProvider
}: {
  depositTx: Transaction
  timestampCreated: string
  childProvider: Provider
  isEthDeposit: boolean
  parentToChildMsg: ParentToChildMessageReaderClassic
}): Promise<Transaction> => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated
  }

  const status = await parentToChildMsg.status()

  const isCompletedEthDeposit =
    isEthDeposit &&
    status >= ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD

  const childTxId = (() => {
    if (isCompletedEthDeposit) {
      return parentToChildMsg.retryableCreationId
    }

    if (status === ParentToChildMessageStatus.REDEEMED) {
      return parentToChildMsg.childTxHash
    }

    return undefined
  })()

  const parentToChildMsgData = {
    status,
    childTxId,
    fetchingUpdate: false,
    retryableCreationTxID: parentToChildMsg.retryableCreationId
  }

  const l2BlockNum = childTxId
    ? (await childProvider.getTransaction(childTxId)).blockNumber
    : null

  const timestampResolved = l2BlockNum
    ? (await childProvider.getBlock(l2BlockNum)).timestamp * 1000
    : null

  const completeDepositTx: Transaction = {
    ...updatedDepositTx,
    status: childTxId ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved: timestampResolved
      ? String(timestampResolved)
      : undefined,
    parentToChildMsgData
  }

  return completeDepositTx
}

async function getTimestampResolved(
  destinationChainProvider: Provider,
  l3TxHash: string | undefined
) {
  if (typeof l3TxHash === 'undefined') {
    return
  }
  return await destinationChainProvider
    .getTransactionReceipt(l3TxHash)
    .then(tx => tx.blockNumber)
    .then(blockNumber => destinationChainProvider.getBlock(blockNumber))
    .then(block => String(block.timestamp * 1000))
}

export async function fetchTeleporterDepositStatusData({
  assetType,
  sourceChainId,
  destinationChainId,
  txId
}: {
  assetType: AssetType
  sourceChainId: number
  destinationChainId: number
  txId: string
}): Promise<{
  status?: TxnStatus
  timestampResolved?: string
  l1ToL2MsgData?: ParentToChildMessageData
  l2ToL3MsgData: L2ToL3MessageData
}> {
  const isNativeCurrencyTransfer = assetType === AssetType.ETH
  const sourceChainProvider = getProviderForChainId(sourceChainId)
  const destinationChainProvider = getProviderForChainId(destinationChainId)
  const { l2ChainId } = await getL2ConfigForTeleport({
    destinationChainProvider
  })

  function isEthTeleport(
    status: EthL1L3DepositStatus | Erc20L1L3DepositStatus
  ): status is EthL1L3DepositStatus {
    return isNativeCurrencyTransfer
  }

  try {
    const depositStatus = await fetchTeleportStatusFromTxId({
      txId,
      sourceChainProvider,
      destinationChainProvider,
      isNativeCurrencyTransfer
    })
    const l2ToL3MsgData: L2ToL3MessageData = {
      status: ParentToChildMessageStatus.NOT_YET_CREATED,
      l2ChainId
    }
    const l2Retryable = isEthTeleport(depositStatus)
      ? depositStatus.l2Retryable
      : depositStatus.l1l2TokenBridgeRetryable
    const l2ForwarderFactoryRetryable = isEthTeleport(depositStatus)
      ? null
      : depositStatus.l2ForwarderFactoryRetryable
    const l3Retryable = isEthTeleport(depositStatus)
      ? depositStatus.l3Retryable
      : depositStatus.l2l3TokenBridgeRetryable

    // extract the l2 transaction details, if any
    const l1l2Redeem = await l2Retryable.getSuccessfulRedeem()
    const l1ToL2MsgData: ParentToChildMessageData = {
      status: await l2Retryable.status(),
      childTxId:
        l1l2Redeem && l1l2Redeem.status === ParentToChildMessageStatus.REDEEMED
          ? l1l2Redeem.childTxReceipt.transactionHash
          : undefined,
      fetchingUpdate: false,
      retryableCreationTxID: l2Retryable.retryableCreationId
    }

    // in case the forwarder retryable has failed, add it to the `l2ToL3MsgData`, else leave it undefined
    // note: having `l2ForwarderRetryableTxID` in the `l2ToL3MsgData` will mean that it needs redemption
    if (
      !depositStatus.completed &&
      l2ForwarderFactoryRetryable &&
      (await l2ForwarderFactoryRetryable.status()) ===
        ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD
    ) {
      return {
        status: l2Retryable ? 'success' : 'failure',
        timestampResolved: undefined,
        l1ToL2MsgData,
        l2ToL3MsgData: {
          ...l2ToL3MsgData,
          status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
          l2ForwarderRetryableTxID:
            l2ForwarderFactoryRetryable.retryableCreationId
        }
      }
    } else if (l3Retryable) {
      // extract the l3 transaction details, if any
      const l2L3Redeem = await l3Retryable.getSuccessfulRedeem()
      const l3TxID =
        l2L3Redeem && l2L3Redeem.status === ParentToChildMessageStatus.REDEEMED
          ? l2L3Redeem.childTxReceipt.transactionHash
          : undefined
      const timestampResolved = await getTimestampResolved(
        destinationChainProvider,
        l3TxID
      )

      // extract the new L2 tx details if we find that `l2ForwarderFactoryRetryable` has been redeemed manually
      // the new l2TxId will be helpful to get l2L3 redemption details while redeeming
      if (l2ForwarderFactoryRetryable) {
        const l2ForwarderRedeem =
          await l2ForwarderFactoryRetryable.getSuccessfulRedeem()
        if (l2ForwarderRedeem.status === ParentToChildMessageStatus.REDEEMED) {
          return {
            status: l2Retryable ? 'success' : 'failure',
            timestampResolved,
            l1ToL2MsgData: {
              ...l1ToL2MsgData,
              childTxId: l2ForwarderRedeem.childTxReceipt.transactionHash
            },
            l2ToL3MsgData: {
              ...l2ToL3MsgData,
              l3TxID,
              status: await l3Retryable.status(),
              retryableCreationTxID: l3Retryable.retryableCreationId
            }
          }
        }
      }

      return {
        status: l2Retryable ? 'success' : 'failure',
        timestampResolved,
        l1ToL2MsgData,
        l2ToL3MsgData: {
          ...l2ToL3MsgData,
          status: await l3Retryable.status(),
          l3TxID,
          retryableCreationTxID: l3Retryable.retryableCreationId
        }
      }
    }

    return {
      status: l2Retryable ? 'success' : 'failure',
      timestampResolved: undefined,
      l1ToL2MsgData,
      l2ToL3MsgData
    }
  } catch (e) {
    // in case fetching teleport status fails (happens sometimes when you fetch before l1 confirmation), return the default data
    console.log('Error fetching status for teleporter tx', txId)
    return {
      status: 'pending',
      l2ToL3MsgData: {
        status: ParentToChildMessageStatus.NOT_YET_CREATED,
        l2ChainId
      }
    }
  }
}

export const getParentToChildMessageDataFromParentTxHash = async ({
  depositTxId,
  isEthDeposit,
  parentProvider,
  childProvider,
  isClassic // optional: if we already know if tx is classic (eg. through subgraph) then no need to re-check in this fn
}: {
  depositTxId: string
  parentProvider: Provider
  isEthDeposit: boolean
  childProvider: Provider
  isClassic?: boolean
}): Promise<{
  isClassic?: boolean
  parentToChildMsg?:
    | ParentToChildMessageReaderClassic
    | EthDepositMessage
    | ParentToChildMessageReader
}> => {
  // fetch Parent transaction receipt
  const depositTxReceipt = await parentProvider.getTransactionReceipt(
    depositTxId
  )

  // TODO: Handle tx not found
  if (!depositTxReceipt) {
    return {}
  }

  const parentTxReceipt = new ParentTransactionReceipt(depositTxReceipt)

  const getClassicDepositMessage = async () => {
    const [parentToChildMsg] =
      await parentTxReceipt.getParentToChildMessagesClassic(childProvider)
    return {
      isClassic: true,
      parentToChildMsg
    }
  }

  const getNitroDepositMessage = async () => {
    // post-nitro handling
    if (isEthDeposit) {
      // nitro eth deposit
      const [ethDepositMessage] = await parentTxReceipt.getEthDeposits(
        childProvider
      )
      return {
        isClassic: false,
        parentToChildMsg: ethDepositMessage
      }
    }

    // Else, nitro token deposit
    const [parentToChildMsg] = await parentTxReceipt.getParentToChildMessages(
      childProvider
    )
    return {
      isClassic: false,
      parentToChildMsg
    }
  }

  const safeIsClassic =
    isClassic ?? (await parentTxReceipt.isClassic(childProvider)) // if it is unknown whether the transaction isClassic or not, fetch the result

  if (safeIsClassic) {
    // classic (pre-nitro) deposit - both eth + token
    return getClassicDepositMessage()
  }

  // post-nitro deposit - both eth + token
  return getNitroDepositMessage()
}
