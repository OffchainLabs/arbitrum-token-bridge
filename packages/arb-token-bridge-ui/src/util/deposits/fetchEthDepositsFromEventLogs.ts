import { BlockTag, Provider } from '@ethersproject/providers'
import { getParentToChildMessagesAndDepositMessages } from '../../components/TransactionHistory/TransactionHistoryTxHashSearch/getParentToChildMessagesAndDepositMessages'
import { ReceiptState } from '../../components/TransactionHistory/TransactionHistoryTxHashSearch/helpers'

export async function fetchEthDepositsFromEventLogs({
  sender,
  fromBlock,
  toBlock,
  l1Provider
}: {
  sender?: string
  fromBlock: BlockTag
  toBlock: BlockTag
  l1Provider: Provider
}) {
  if (typeof sender === 'undefined') {
    return Promise.resolve([])
  }

  // funds received by this address

  const getParentTxReceiptResult = await getParentTxReceipt(txHash)
  const parentTxReceiptAndChainId = getParentTxReceiptResult
  const defaultReturn: {
    allMessages: ParentToChildMessagesAndDepositMessages
    l2ToL1MessagesToShow: ChildToParentMessageData[]
    parentTxReceipt: ParentTransactionReceipt | undefined
    parentChainId: number | undefined
  } = {
    allMessages: {
      retryables: [],
      retryablesClassic: [],
      deposits: [],
      childChainId: null
    },
    l2ToL1MessagesToShow: [],
    parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
    parentChainId: parentTxReceiptAndChainId?.parentChainId
  }

  if (typeof getParentTxReceiptResult === 'undefined') {
    return undefined
  }

  const { parentTxReceipt: _parentTxReceipt, parentChainId } =
    getParentTxReceiptResult
  if (
    _parentTxReceipt?.status === 0 ||
    typeof _parentTxReceipt === 'undefined'
  ) {
    return {
      ...defaultReturn,
      parentTxReceipt: _parentTxReceipt,
      txHashState: ReceiptState.L1_FAILED
    }
  }
  console.log('getParentTxReceiptResult? ', getParentTxReceiptResult)
  console.log('_parentTxReceipt? ', _parentTxReceipt)

  const allMessages = await getParentToChildMessagesAndDepositMessages(
    _parentTxReceipt,
    parentChainId
  )
  console.log('allMessages? ', allMessages)
  const l1ToL2Messages = allMessages.retryables
  const l1ToL2MessagesClassic = allMessages.retryablesClassic
  const depositMessages = allMessages.deposits
  if (
    l1ToL2Messages.length === 0 &&
    l1ToL2MessagesClassic.length === 0 &&
    depositMessages.length === 0
  ) {
    return {
      ...defaultReturn,
      parentTxReceipt: _parentTxReceipt,
      parentChainId,
      txHashState: ReceiptState.NO_L1_L2_MESSAGES
    }
  }

  return {
    ...defaultReturn,
    allMessages,
    parentTxReceipt: _parentTxReceipt,
    parentChainId,
    txHashState: ReceiptState.MESSAGES_FOUND
  }
}
