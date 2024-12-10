import { getArbitrumNetworks } from '@arbitrum/sdk'

import { FetchDepositsFromSubgraphResult } from './fetchDepositsFromSubgraph'
import { getAPIBaseUrl, sanitizeQueryParams } from '..'
import { hasL1Subgraph } from '../SubgraphUtils'
import { getNetworkName } from '../networks'
import { Transaction } from '../../hooks/useTransactions'
import { fetchNativeCurrency } from '../../hooks/useNativeCurrency'
import { mapDepositsFromSubgraph } from './mapDepositsFromSubgraph'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'

/**
 * Fetches initiated ETH deposit from event logs using transaction id
 *
 * @param txHash transaction id on parent chain
 */
export async function fetchDepositTxFromSubgraph(
  txHash: string
): Promise<Transaction[] | undefined> {
  const supportedChildChains = getArbitrumNetworks()

  const fetcherList = supportedChildChains.map(childChain => {
    const childChainId = childChain.chainId

    if (!hasL1Subgraph(Number(childChainId))) {
      console.error(
        `Parent chain subgraph not available for network: ${getNetworkName(
          childChainId
        )} (${childChainId})`
      )
      return undefined
    }

    const urlParams = new URLSearchParams(
      sanitizeQueryParams({
        search: txHash,
        l2ChainId: childChainId
      })
    )

    return {
      fetcher: fetch(`${getAPIBaseUrl()}/api/deposits?${urlParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }),
      parentChainId: childChain.parentChainId,
      childChainId
    }
  })

  try {
    const responses = await Promise.all(fetcherList.map(item => item?.fetcher))

    // there is always only one response because this tx only lives on one chain and no collision is possible
    const result = responses
      .map((response, index) => {
        const fetcherItem = fetcherList[index]
        if (typeof fetcherItem === 'undefined') {
          return undefined
        }
        return {
          response,
          parentChainId: fetcherItem.parentChainId,
          childChainId: fetcherItem.childChainId
        }
      })
      .filter(Boolean)[0] as {
      response: Response
      parentChainId: number
      childChainId: number
    }

    const depositsFromSubgraph: FetchDepositsFromSubgraphResult[] = (
      await result.response.json()
    ).data

    const nativeCurrency = await fetchNativeCurrency({
      provider: getProviderForChainId(result.childChainId)
    })

    const mappedDepositsFromSubgraph: Transaction[] = mapDepositsFromSubgraph({
      depositsFromSubgraph,
      nativeCurrency,
      l1ChainId: result.parentChainId,
      l2ChainId: result.childChainId
    })

    return mappedDepositsFromSubgraph
  } catch (error) {
    return undefined
  }

  // const getParentTxReceiptResult = await getParentTxReceipt(txHash)
  // const parentTxReceiptAndChainId = getParentTxReceiptResult
  // const defaultReturn: {
  //   allMessages: ParentToChildMessagesAndDepositMessages
  //   l2ToL1MessagesToShow: ChildToParentMessageData[]
  //   parentTxReceipt: ParentTransactionReceipt | undefined
  //   parentChainId: number | undefined
  // } = {
  //   allMessages: {
  //     retryables: [],
  //     retryablesClassic: [],
  //     deposits: [],
  //     childChainId: null
  //   },
  //   l2ToL1MessagesToShow: [],
  //   parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
  //   parentChainId: parentTxReceiptAndChainId?.parentChainId
  // }

  // if (typeof getParentTxReceiptResult === 'undefined') {
  //   const res = await getChildToParentMessages(txHash)
  //   const { childTxStatus, childToParentMessages } = res

  //   // TODO: handle terminal states
  //   if (childToParentMessages.length > 0) {
  //     return {
  //       ...defaultReturn,
  //       parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
  //       parentChainId: parentTxReceiptAndChainId?.parentChainId,
  //       txHashState: ReceiptState.MESSAGES_FOUND,
  //       l2ToL1MessagesToShow: childToParentMessages
  //     }
  //   }
  //   if (childTxStatus === ChildTxStatus.SUCCESS) {
  //     return {
  //       ...defaultReturn,
  //       parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
  //       parentChainId: parentTxReceiptAndChainId?.parentChainId,
  //       txHashState: ReceiptState.NO_L2_L1_MESSAGES
  //     }
  //   }
  //   if (childTxStatus === ChildTxStatus.FAILURE) {
  //     return {
  //       ...defaultReturn,
  //       parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
  //       parentChainId: parentTxReceiptAndChainId?.parentChainId,
  //       txHashState: ReceiptState.L2_FAILED
  //     }
  //   }

  //   return {
  //     ...defaultReturn,
  //     parentTxReceipt: parentTxReceiptAndChainId?.parentTxReceipt,
  //     parentChainId: parentTxReceiptAndChainId?.parentChainId,
  //     txHashState: ReceiptState.NOT_FOUND
  //   }
  // }

  // const { parentTxReceipt: _parentTxReceipt, parentChainId } =
  //   getParentTxReceiptResult
  // if (
  //   _parentTxReceipt?.status === 0 ||
  //   typeof _parentTxReceipt === 'undefined'
  // ) {
  //   return {
  //     ...defaultReturn,
  //     parentTxReceipt: _parentTxReceipt,
  //     txHashState: ReceiptState.L1_FAILED
  //   }
  // }
  // console.log('getParentTxReceiptResult? ', getParentTxReceiptResult)
  // console.log('_parentTxReceipt? ', _parentTxReceipt)

  // const allMessages = await getParentToChildMessagesAndDepositMessages(
  //   _parentTxReceipt,
  //   parentChainId
  // )
  // console.log('allMessages? ', allMessages)
  // const l1ToL2Messages = allMessages.retryables
  // const l1ToL2MessagesClassic = allMessages.retryablesClassic
  // const depositMessages = allMessages.deposits
  // if (
  //   l1ToL2Messages.length === 0 &&
  //   l1ToL2MessagesClassic.length === 0 &&
  //   depositMessages.length === 0
  // ) {
  //   return {
  //     ...defaultReturn,
  //     parentTxReceipt: _parentTxReceipt,
  //     parentChainId,
  //     txHashState: ReceiptState.NO_L1_L2_MESSAGES
  //   }
  // }

  // return {
  //   ...defaultReturn,
  //   allMessages,
  //   parentTxReceipt: _parentTxReceipt,
  //   parentChainId,
  //   txHashState: ReceiptState.MESSAGES_FOUND
  // }
}
