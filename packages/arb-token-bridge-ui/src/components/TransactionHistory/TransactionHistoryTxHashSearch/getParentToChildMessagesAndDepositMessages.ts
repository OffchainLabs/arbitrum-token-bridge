import {
  getArbitrumNetwork,
  getArbitrumNetworks,
  ParentTransactionReceipt
} from '@arbitrum/sdk'

import {
  EthDepositMessageWithNetwork,
  ParentToChildMessagesAndDepositMessages
} from './helpers'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

export const getParentToChildMessagesAndDepositMessages = async (
  parentTxReceipt: ParentTransactionReceipt,
  parentChainId: number
): Promise<ParentToChildMessagesAndDepositMessages> => {
  try {
    const childNetworks = getArbitrumNetworks().map(network => network.chainId)
    const messagesPromises = childNetworks.map(async childChainId => {
      // TODO: error handle
      const childNetwork = await getArbitrumNetwork(childChainId)

      // Check if any l1ToL2 msg is sent to the inbox of this l2Network
      const logFromL2Inbox = parentTxReceipt.logs.filter(log => {
        return (
          log.address.toLowerCase() ===
          childNetwork.ethBridge.inbox.toLowerCase()
        )
      })
      if (logFromL2Inbox.length === 0) {
        return
      }

      const childProvider = getProviderForChainId(childChainId)
      const isClassic = await parentTxReceipt.isClassic(childProvider)

      if (isClassic) {
        const messages = (
          await parentTxReceipt.getParentToChildMessagesClassic(childProvider)
        ).map(l1ToL2Message => {
          return Object.assign(l1ToL2Message, { childNetwork })
        })
        return {
          allL1ToL2Messages: [],
          allL1ToL2MessagesClassic: messages,
          allDepositMessages: [],
          childChainId
        }
      } else {
        const messages = (
          await parentTxReceipt.getParentToChildMessages(childProvider)
        ).map(l1ToL2Message => {
          return Object.assign(l1ToL2Message, { childNetwork })
        })

        const depositMessagesWithNetwork: EthDepositMessageWithNetwork[] = (
          await parentTxReceipt.getEthDeposits(childProvider)
        ).map(depositMessage => {
          return Object.assign(depositMessage, { childNetwork })
        })

        return {
          allL1ToL2Messages: messages,
          allDepositMessages: depositMessagesWithNetwork,
          allL1ToL2MessagesClassic: [],
          childChainId
        }
      }
    })

    const messages = await Promise.all(messagesPromises)

    const allMessages = messages.reduce(
      (acc, value) => {
        if (!value) {
          return acc
        }
        return {
          retryables: acc.retryables.concat(value.allL1ToL2Messages),
          retryablesClassic: acc.retryablesClassic.concat(
            value.allL1ToL2MessagesClassic
          ),
          deposits: acc.deposits.concat(value.allDepositMessages),
          childChainId: value.childChainId
        }
      },
      {
        retryables: [],
        retryablesClassic: [],
        deposits: [],
        childChainId: null
      } as ParentToChildMessagesAndDepositMessages
    )
    return allMessages
  } catch (error) {
    console.error(
      'Error in getParentToChildMessagesAndDepositMessages: ',
      error
    )
    return {
      retryables: [],
      retryablesClassic: [],
      deposits: [],
      childChainId: null
    } as ParentToChildMessagesAndDepositMessages
  }
}
