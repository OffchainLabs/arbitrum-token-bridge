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

export const updateAdditionalDepositData = async (
  depositTx: Transaction,
  l1Provider: Provider,
  l2Provider: Provider
) => {
  // 1. for all the fetched txns, fetch the transaction receipts and update their exact status
  // 2. on the basis of those, finally calculate the status of the transaction

  try {
    // fetch L1 transaction receipt
    const depositTxReceipt = await l1Provider.getTransactionReceipt(
      depositTx.txID
    )
    const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)

    // fetch timestamp creation date
    let timestampCreated = new Date().toISOString()
    if (depositTx.timestampCreated) {
      // if timestamp is already there in Subgraphs, take it from there
      timestampCreated = String(+depositTx.timestampCreated * 1000)
    } else if (depositTx.blockNumber) {
      // if timestamp not in subgraph, fallback to onchain data
      timestampCreated = String(
        (await l1Provider.getBlock(depositTx.blockNumber)).timestamp * 1000
      )
    }

    const isEthDeposit = depositTx.assetName === AssetType.ETH
    const { l1ToL2Msg, isClassic } = await getRetyableMessageDataFromTxID({
      depositTxId: depositTx.txID,
      l1Provider,
      l2Provider,
      isEthDeposit
    })

    if (isClassic) {
      const updatedDepositTx = updateAdditionalDepositDataClassic({
        depositTx,
        l1ToL2Msg: l1ToL2Msg as L1ToL2MessageReaderClassic,
        isEthDeposit,
        timestampCreated,
        l2Provider
      })

      return updatedDepositTx
    }

    // Check if deposit is ETH
    if (isEthDeposit) {
      const updatedDepositTx = await updateAdditionalDepositDataETH({
        depositTx,
        ethDepositMessage: l1ToL2Msg as EthDepositMessage,
        l2Provider,
        timestampCreated
      })

      return updatedDepositTx
    } else {
      // else if the transaction is not ETH ie. it's a ERC20 token deposit
      const updatedDepositTx = await updateAdditionalDepositDataToken({
        depositTx,
        l1ToL2Msg: l1ToL2Msg as L1ToL2MessageReader,
        timestampCreated,
        l2Provider
      })
      return updatedDepositTx
    }
  } catch (e) {
    // error fetching transaction details through RPC, possibly because SDK doesn't support classic retryable transactions yet
    console.log(e)
    return { ...depositTx, status: 'warning' }
  }
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
}) => {
  // from the eth-deposit-message, extract more things like retryableCreationTxID, status, etc
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
  const updatedDepositTx = {
    ...depositTx,
    status: retryableCreationTxID ? 'success' : 'pending',
    timestampCreated,
    timestampResolved,
    l1ToL2MsgData: {
      status: isDeposited
        ? L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
        : L1ToL2MessageStatus.NOT_YET_CREATED,
      retryableCreationTxID,
      // Only show `l2TxID` after the deposit is confirmed
      l2TxID: isDeposited ? ethDepositMessage.l2DepositTxHash : undefined
    }
  }

  return updatedDepositTx
}

const updateAdditionalDepositDataToken = async ({
  depositTx,
  l1ToL2Msg,
  timestampCreated,
  l2Provider
}: {
  depositTx: Transaction
  timestampCreated: string
  l2Provider: Provider
  l1ToL2Msg: L1ToL2MessageReader
}) => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated
  }
  const res = await l1ToL2Msg.waitForStatus()

  const l2TxID = (() => {
    if (res.status === L1ToL2MessageStatus.REDEEMED) {
      return res.l2TxReceipt.transactionHash
    } else {
      return undefined
    }
  })()

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

  const completeDepositTx = {
    ...updatedDepositTx,
    status: l1ToL2Msg.retryableCreationId ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved,
    l1ToL2MsgData: l1ToL2MsgData
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
}) => {
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
    status: status,
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

  const completeDepositTx = {
    ...updatedDepositTx,
    status: l2TxID ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved,
    l1ToL2MsgData: l1ToL2MsgData
  }

  console.log('COMPLETE', completeDepositTx)
  return completeDepositTx
}

export const getRetyableMessageDataFromTxID = async ({
  depositTxId,
  isEthDeposit,
  l1Provider,
  l2Provider
}: {
  depositTxId: string
  l1Provider: Provider
  isEthDeposit: boolean
  l2Provider: Provider
}): Promise<{
  isClassic?: boolean
  l1ToL2Msg?:
    | L1ToL2MessageReaderClassic
    | EthDepositMessage
    | L1ToL2MessageReader
}> => {
  const depositTxReceipt = await l1Provider.getTransactionReceipt(depositTxId)

  // TODO: Handle tx not found
  if (!depositTxReceipt) {
    return {}
  }

  const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)
  const l1TxReceiptIsClassic = await l1TxReceipt.isClassic(l2Provider)

  if (l1TxReceiptIsClassic) {
    // classic (pre-nitro) deposit - both eth + token
    const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2MessagesClassic(l2Provider)
    return {
      isClassic: true,
      l1ToL2Msg: l1ToL2Msg
    }
  } else {
    // post-nitro handling
    if (isEthDeposit) {
      // nitro eth deposit
      const [ethDepositMessage] = await l1TxReceipt.getEthDeposits(l2Provider)
      return {
        isClassic: false,
        l1ToL2Msg: ethDepositMessage
      }
    } else {
      // nitro token deposit
      const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2Messages(l2Provider)
      return {
        isClassic: false,
        l1ToL2Msg: l1ToL2Msg
      }
    }
  }
}
