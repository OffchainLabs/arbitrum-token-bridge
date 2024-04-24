import {
  ParentTransactionReceipt,
  ParentToChildMessageStatus,
  EthDepositStatus
} from '@arbitrum/sdk'
import {
  EthDepositMessage,
  ParentToChildMessageReader,
  ParentToChildMessageReaderClassic
} from '@arbitrum/sdk/dist/lib/message/ParentToChildMessage'
import { Provider } from '@ethersproject/providers'

import { AssetType } from '../../hooks/arbTokenBridge.types'
import { Transaction } from '../../hooks/useTransactions'
import { fetchErc20Data } from '../TokenUtils'

export const updateAdditionalDepositData = async ({
  depositTx,
  parentProvider,
  childProvider
}: {
  depositTx: Transaction
  parentProvider: Provider
  childProvider: Provider
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

  // finally, else if the transaction is not ETH ie. it's a ERC20 token deposit
  return updateTokenDepositStatusData({
    depositTx,
    parentToChildMsg: parentToChildMsg as ParentToChildMessageReader,
    timestampCreated,
    parentProvider,
    childProvider
  })
}

const updateETHDepositStatusData = async ({
  depositTx,
  childProvider,
  ethDepositMessage,
  timestampCreated
}: {
  depositTx: Transaction
  childProvider: Provider
  ethDepositMessage: EthDepositMessage
  timestampCreated: string
}): Promise<Transaction> => {
  // from the eth-deposit-message, extract more things like retryableCreationTxID, status, etc

  if (!ethDepositMessage) return depositTx

  const status = await ethDepositMessage.status()
  const isDeposited = status === EthDepositStatus.DEPOSITED

  const retryableCreationTxID = ethDepositMessage.chainDepositTxHash

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
        ? ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHAIN
        : ParentToChildMessageStatus.NOT_YET_CREATED,
      retryableCreationTxID,
      // Only show `childTxID` after the deposit is confirmed
      childTxID: isDeposited ? ethDepositMessage.chainDepositTxHash : undefined,
      fetchingUpdate: false
    }
  }

  return updatedDepositTx
}

const updateTokenDepositStatusData = async ({
  depositTx,
  parentProvider,
  childProvider,
  parentToChildMsg,
  timestampCreated
}: {
  depositTx: Transaction
  parentProvider: Provider
  childProvider: Provider
  parentToChildMsg: ParentToChildMessageReader
  timestampCreated: string
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

  // get the status data of `parentToChildMsg`, if it is redeemed - `getSuccessfulRedeem` also returns its childTxReceipt
  const res = await parentToChildMsg.getSuccessfulRedeem()

  const childTxID =
    res.status === ParentToChildMessageStatus.REDEEMED
      ? res.chainTxReceipt.transactionHash
      : undefined

  const parentToChildMsgData = {
    status: res.status,
    childTxID,
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
  childProvider,
  parentToChildMsg,
  isEthDeposit,
  timestampCreated
}: {
  depositTx: Transaction
  childProvider: Provider
  parentToChildMsg: ParentToChildMessageReaderClassic
  isEthDeposit: boolean
  timestampCreated: string
}): Promise<Transaction> => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated
  }

  const status = await parentToChildMsg.status()

  const isCompletedEthDeposit =
    isEthDeposit &&
    status >= ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHAIN

  const childTxID = (() => {
    if (isCompletedEthDeposit) {
      return parentToChildMsg.retryableCreationId
    }

    if (status === ParentToChildMessageStatus.REDEEMED) {
      return parentToChildMsg.chainTxHash
    }

    return undefined
  })()

  const parentToChildMsgData = {
    status,
    childTxID,
    fetchingUpdate: false,
    retryableCreationTxID: parentToChildMsg.retryableCreationId
  }

  const childBlockNum = childTxID
    ? (await childProvider.getTransaction(childTxID)).blockNumber
    : null

  const timestampResolved = childBlockNum
    ? (await childProvider.getBlock(childBlockNum)).timestamp * 1000
    : null

  const completeDepositTx: Transaction = {
    ...updatedDepositTx,
    status: childTxID ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved: timestampResolved
      ? String(timestampResolved)
      : undefined,
    parentToChildMsgData
  }

  return completeDepositTx
}

export const getParentToChildMessageDataFromParentTxHash = async ({
  depositTxId,
  parentProvider,
  childProvider,
  isEthDeposit,
  isClassic // optional: if we already know if tx is classic (eg. through subgraph) then no need to re-check in this fn
}: {
  depositTxId: string
  parentProvider: Provider
  childProvider: Provider
  isEthDeposit: boolean
  isClassic?: boolean
}): Promise<{
  isClassic?: boolean
  parentToChildMsg?:
    | ParentToChildMessageReaderClassic
    | EthDepositMessage
    | ParentToChildMessageReader
}> => {
  // fetch parent transaction receipt
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
