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

import { Provider } from '@ethersproject/providers'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import {
  L1ToL2MessageData,
  L2ToL3MessageData,
  Transaction,
  TxnStatus
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
  l1Provider,
  l2Provider
}: {
  depositTx: Transaction
  l1Provider: Provider
  l2Provider: Provider
}): Promise<Transaction> => {
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
      (await l1Provider.getBlock(depositTx.blockNumber)).timestamp * 1000
    )
  }

  // there are scenarios where we will return the deposit tx early
  // we need to make sure it has the updated timestamp no matter what
  depositTx.timestampCreated = timestampCreated

  const { isClassic } = depositTx // isClassic is known before-hand from subgraphs

  const isEthDeposit = depositTx.assetType === AssetType.ETH

  const { l1ToL2Msg } = await getL1ToL2MessageDataFromL1TxHash({
    depositTxId: depositTx.txID,
    l1Provider,
    l2Provider,
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
      l1ToL2MsgData,
      l2ToL3MsgData
    }
  }

  if (isClassic) {
    return updateClassicDepositStatusData({
      depositTx,
      l1ToL2Msg: l1ToL2Msg as ParentToChildMessageReaderClassic,
      isEthDeposit,
      timestampCreated,
      l2Provider
    })
  }

  // Check if deposit is ETH
  if (isEthDeposit) {
    return updateETHDepositStatusData({
      depositTx,
      ethDepositMessage: l1ToL2Msg as EthDepositMessage,
      l2Provider,
      timestampCreated
    })
  }

  // finally, else if the transaction is not ETH ie. it's a ERC20 token deposit
  return updateTokenDepositStatusData({
    depositTx,
    l1ToL2Msg: l1ToL2Msg as ParentToChildMessageReader,
    timestampCreated,
    l1Provider,
    l2Provider
  })
}

const updateETHDepositStatusData = async ({
  depositTx,
  ethDepositMessage,
  l2Provider,
  timestampCreated
}: {
  depositTx: Transaction
  ethDepositMessage: EthDepositMessage
  timestampCreated: string
  l2Provider: Provider
}): Promise<Transaction> => {
  // from the eth-deposit-message, extract more things like retryableCreationTxID, status, etc

  if (!ethDepositMessage) return depositTx

  const status = await ethDepositMessage.status()
  const isDeposited = status === EthDepositMessageStatus.DEPOSITED

  const retryableCreationTxID = ethDepositMessage.childTxHash

  const l2BlockNum = isDeposited
    ? (await l2Provider.getTransaction(retryableCreationTxID)).blockNumber
    : null

  const timestampResolved = l2BlockNum
    ? (await l2Provider.getBlock(l2BlockNum)).timestamp * 1000
    : null

  // return the data to populate on UI
  const updatedDepositTx: Transaction = {
    ...depositTx,
    status: retryableCreationTxID ? 'success' : 'pending',
    timestampCreated,
    timestampResolved: timestampResolved
      ? String(timestampResolved)
      : undefined,
    l1ToL2MsgData: {
      status: isDeposited
        ? ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD
        : ParentToChildMessageStatus.NOT_YET_CREATED,
      retryableCreationTxID,
      // Only show `l2TxID` after the deposit is confirmed
      l2TxID: isDeposited ? ethDepositMessage.childTxHash : undefined,
      fetchingUpdate: false
    }
  }

  return updatedDepositTx
}

const updateTokenDepositStatusData = async ({
  depositTx,
  l1ToL2Msg,
  timestampCreated,
  l1Provider,
  l2Provider
}: {
  depositTx: Transaction
  timestampCreated: string
  l1Provider: Provider
  l2Provider: Provider
  l1ToL2Msg: ParentToChildMessageReader
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
      provider: l1Provider
    })
    updatedDepositTx.assetName = symbol
  }

  if (!l1ToL2Msg) return updatedDepositTx

  // get the status data of `l1ToL2Msg`, if it is redeemed - `getSuccessfulRedeem` also returns its l2TxReceipt
  const res = await l1ToL2Msg.getSuccessfulRedeem()

  const l2TxID =
    res.status === ParentToChildMessageStatus.REDEEMED
      ? res.childTxReceipt.transactionHash
      : undefined

  const l1ToL2MsgData = {
    status: res.status,
    l2TxID,
    fetchingUpdate: false,
    retryableCreationTxID: l1ToL2Msg.retryableCreationId
  }

  const isDeposited =
    l1ToL2MsgData.status === ParentToChildMessageStatus.REDEEMED

  const l2BlockNum = isDeposited
    ? (await l2Provider.getTransaction(l1ToL2Msg.retryableCreationId))
        .blockNumber
    : null

  const timestampResolved = l2BlockNum
    ? (await l2Provider.getBlock(l2BlockNum)).timestamp * 1000
    : null

  const completeDepositTx: Transaction = {
    ...updatedDepositTx,
    status: l1ToL2Msg.retryableCreationId ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved: timestampResolved
      ? String(timestampResolved)
      : undefined,
    l1ToL2MsgData
  }

  return completeDepositTx
}

const updateClassicDepositStatusData = async ({
  depositTx,
  l1ToL2Msg,
  isEthDeposit,
  timestampCreated,
  l2Provider
}: {
  depositTx: Transaction
  timestampCreated: string
  l2Provider: Provider
  isEthDeposit: boolean
  l1ToL2Msg: ParentToChildMessageReaderClassic
}): Promise<Transaction> => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated
  }

  const status = await l1ToL2Msg.status()

  const isCompletedEthDeposit =
    isEthDeposit &&
    status >= ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD

  const l2TxID = (() => {
    if (isCompletedEthDeposit) {
      return l1ToL2Msg.retryableCreationId
    }

    if (status === ParentToChildMessageStatus.REDEEMED) {
      return l1ToL2Msg.childTxHash
    }

    return undefined
  })()

  const l1ToL2MsgData = {
    status,
    l2TxID,
    fetchingUpdate: false,
    retryableCreationTxID: l1ToL2Msg.retryableCreationId
  }

  const l2BlockNum = l2TxID
    ? (await l2Provider.getTransaction(l2TxID)).blockNumber
    : null

  const timestampResolved = l2BlockNum
    ? (await l2Provider.getBlock(l2BlockNum)).timestamp * 1000
    : null

  const completeDepositTx: Transaction = {
    ...updatedDepositTx,
    status: l2TxID ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved: timestampResolved
      ? String(timestampResolved)
      : undefined,
    l1ToL2MsgData
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
  l1ToL2MsgData?: L1ToL2MessageData
  l2ToL3MsgData?: L2ToL3MessageData
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
    const l1ToL2MsgData: L1ToL2MessageData = {
      status: await l2Retryable.status(),
      l2TxID:
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
              l2TxID: l2ForwarderRedeem.childTxReceipt.transactionHash
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

export const getL1ToL2MessageDataFromL1TxHash = async ({
  depositTxId,
  isEthDeposit,
  l1Provider,
  l2Provider,
  isClassic // optional: if we already know if tx is classic (eg. through subgraph) then no need to re-check in this fn
}: {
  depositTxId: string
  l1Provider: Provider
  isEthDeposit: boolean
  l2Provider: Provider
  isClassic?: boolean
}): Promise<{
  isClassic?: boolean
  l1ToL2Msg?:
    | ParentToChildMessageReaderClassic
    | EthDepositMessage
    | ParentToChildMessageReader
}> => {
  // fetch L1 transaction receipt
  const depositTxReceipt = await l1Provider.getTransactionReceipt(depositTxId)

  // TODO: Handle tx not found
  if (!depositTxReceipt) {
    return {}
  }

  const l1TxReceipt = new ParentTransactionReceipt(depositTxReceipt)

  const getClassicDepositMessage = async () => {
    const [l1ToL2Msg] = await l1TxReceipt.getParentToChildMessagesClassic(
      l2Provider
    )
    return {
      isClassic: true,
      l1ToL2Msg: l1ToL2Msg
    }
  }

  const getNitroDepositMessage = async () => {
    // post-nitro handling
    if (isEthDeposit) {
      // nitro eth deposit
      const [ethDepositMessage] = await l1TxReceipt.getEthDeposits(l2Provider)
      return {
        isClassic: false,
        l1ToL2Msg: ethDepositMessage
      }
    }

    // Else, nitro token deposit
    const [l1ToL2Msg] = await l1TxReceipt.getParentToChildMessages(l2Provider)
    return {
      isClassic: false,
      l1ToL2Msg
    }
  }

  const safeIsClassic = isClassic ?? (await l1TxReceipt.isClassic(l2Provider)) // if it is unknown whether the transaction isClassic or not, fetch the result

  if (safeIsClassic) {
    // classic (pre-nitro) deposit - both eth + token
    return getClassicDepositMessage()
  }

  // post-nitro deposit - both eth + token
  return getNitroDepositMessage()
}
