import {
  L1TransactionReceipt,
  L1ToL2MessageStatus,
  EthDepositStatus
} from '@arbitrum/sdk'
import {
  EthDepositMessage,
  L1ToL2MessageReader,
  L1ToL2MessageReaderClassic
} from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'
import { Provider } from '@ethersproject/providers'
import { AssetType } from '../hooks/arbTokenBridge.types'
import { Transaction } from '../hooks/useTransactions'
import { getL1TokenData } from '../util'

export const updateAdditionalDepositData = async (
  depositTx: Transaction,
  l1Provider: Provider,
  l2Provider: Provider
): Promise<Transaction> => {
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

  const { isClassic } = depositTx // isClassic is known before-hand from subgraphs

  const isEthDeposit = depositTx.assetType === AssetType.ETH

  const { l1ToL2Msg } = await getL1ToL2MessageDataFromL1TxHash({
    depositTxId: depositTx.txID,
    l1Provider,
    l2Provider,
    isEthDeposit,
    isClassic
  })

  if (isClassic) {
    return updateAdditionalDepositDataClassic({
      depositTx,
      l1ToL2Msg: l1ToL2Msg as L1ToL2MessageReaderClassic,
      isEthDeposit,
      timestampCreated,
      l2Provider
    })
  }

  // Check if deposit is ETH
  if (isEthDeposit) {
    return updateAdditionalDepositDataETH({
      depositTx,
      ethDepositMessage: l1ToL2Msg as EthDepositMessage,
      l2Provider,
      timestampCreated
    })
  }

  // finally, else if the transaction is not ETH ie. it's a ERC20 token deposit
  return updateAdditionalDepositDataToken({
    depositTx,
    l1ToL2Msg: l1ToL2Msg as L1ToL2MessageReader,
    timestampCreated,
    l1Provider,
    l2Provider
  })
}

const updateAdditionalDepositDataETH = async ({
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
  const isDeposited = status === EthDepositStatus.DEPOSITED

  const retryableCreationTxID = ethDepositMessage.l2DepositTxHash

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
        ? L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
        : L1ToL2MessageStatus.NOT_YET_CREATED,
      retryableCreationTxID,
      // Only show `l2TxID` after the deposit is confirmed
      l2TxID: isDeposited ? ethDepositMessage.l2DepositTxHash : undefined,
      fetchingUpdate: false
    }
  }

  return updatedDepositTx
}

const updateAdditionalDepositDataToken = async ({
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
  l1ToL2Msg: L1ToL2MessageReader
}): Promise<Transaction> => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated
  }

  // fallback to on-chain token information if subgraph doesn't have it
  const { sender, tokenAddress, assetName } = updatedDepositTx
  if (!assetName && tokenAddress) {
    const { symbol } = await getL1TokenData({
      account: sender,
      erc20L1Address: tokenAddress,
      l1Provider,
      l2Provider,
      throwOnInvalidERC20: false
    })
    updatedDepositTx.assetName = symbol
  }

  if (!l1ToL2Msg) return updatedDepositTx

  const res = await l1ToL2Msg.waitForStatus()

  const l2TxID =
    res.status === L1ToL2MessageStatus.REDEEMED
      ? res.l2TxReceipt.transactionHash
      : undefined

  const l1ToL2MsgData = {
    status: res.status,
    l2TxID,
    fetchingUpdate: false,
    retryableCreationTxID: l1ToL2Msg.retryableCreationId
  }

  const isDeposited =
    l1ToL2MsgData.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2

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

const updateAdditionalDepositDataClassic = async ({
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
  l1ToL2Msg: L1ToL2MessageReaderClassic
}): Promise<Transaction> => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated
  }

  const status = await l1ToL2Msg.status()

  const isCompletedEthDeposit =
    isEthDeposit && status >= L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2

  const l2TxID = (() => {
    if (isCompletedEthDeposit) {
      return l1ToL2Msg.retryableCreationId
    }

    if (status === L1ToL2MessageStatus.REDEEMED) {
      return l1ToL2Msg.l2TxHash
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
    | L1ToL2MessageReaderClassic
    | EthDepositMessage
    | L1ToL2MessageReader
}> => {
  // fetch L1 transaction receipt
  const depositTxReceipt = await l1Provider.getTransactionReceipt(depositTxId)

  // TODO: Handle tx not found
  if (!depositTxReceipt) {
    return {}
  }

  const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)

  const getClassicDepositMessage = async () => {
    const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2MessagesClassic(l2Provider)
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
    const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2Messages(l2Provider)
    return {
      isClassic: false,
      l1ToL2Msg
    }
  }

  const safeIsClassic =
    typeof isClassic !== 'undefined'
      ? isClassic
      : // it is unknown whether the transaction isClassic or not, so fetch the result
        await l1TxReceipt.isClassic(l2Provider)

  if (safeIsClassic) {
    // classic (pre-nitro) deposit - both eth + token
    return getClassicDepositMessage()
  }

  // post-nitro deposit - both eth + token
  return getNitroDepositMessage()
}
