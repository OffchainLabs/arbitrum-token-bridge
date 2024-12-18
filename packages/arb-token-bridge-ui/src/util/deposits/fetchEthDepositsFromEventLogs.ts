import { BlockTag, Provider } from '@ethersproject/providers'

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
    const res = await getChildToParentMessages(txHash)
    const { childTxStatus, childToParentMessages } = res

    // TODO: handle terminal states
    if (childToParentMessages.length > 0) {
      return {
        ...defaultReturn,
        parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
        parentChainId: parentTxReceiptAndChainId?.parentChainId,
        txHashState: ReceiptState.MESSAGES_FOUND,
        l2ToL1MessagesToShow: childToParentMessages
      }
    }
    if (childTxStatus === ChildTxStatus.SUCCESS) {
      return {
        ...defaultReturn,
        parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
        parentChainId: parentTxReceiptAndChainId?.parentChainId,
        txHashState: ReceiptState.NO_L2_L1_MESSAGES
      }
    }
    if (childTxStatus === ChildTxStatus.FAILURE) {
      return {
        ...defaultReturn,
        parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
        parentChainId: parentTxReceiptAndChainId?.parentChainId,
        txHashState: ReceiptState.L2_FAILED
      }
    }

    return {
      ...defaultReturn,
      parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
      parentChainId: parentTxReceiptAndChainId?.parentChainId,
      txHashState: ReceiptState.NOT_FOUND
    }
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
