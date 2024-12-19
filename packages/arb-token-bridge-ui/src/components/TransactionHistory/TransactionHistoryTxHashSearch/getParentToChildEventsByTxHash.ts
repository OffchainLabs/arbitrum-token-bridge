import { BigNumber } from 'ethers'
import { BlockTag } from '@ethersproject/providers'
import { EthDepositMessage, getArbitrumNetworks } from '@arbitrum/sdk'

import { getParentTxReceipt } from '../helpers'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { normalizeTimestamp } from '../../../state/app/utils'
import { ParentToChildMessagesAndDepositMessages } from './helpers'

export type FetchDepositTxFromEventLogResult = {
  receiver: string
  sender: string
  timestamp: string
  transactionHash: string
  type: 'EthDeposit' | 'TokenDeposit'
  isClassic: boolean
  id: string
  ethValue: string
  tokenAmount?: string
  blockCreatedAt: string
  l1Token?: {
    symbol: string
    decimals: number
    id: string
    name: string
    registeredAtBlock: string
  }
}

/**
 * Get event logs for ParentToChild transactions.
 * Only support by tx hash for now.
 * @param childProvider
 * @param filter Block range filter
 * @param position The batchnumber indexed field was removed in nitro and a position indexed field was added.
 * For pre-nitro events the value passed in here will be used to find events with the same batchnumber.
 * For post nitro events it will be used to find events with the same position.
 * @param destination The parent destination of the ChildToParent message
 * @param hash The uniqueId indexed field was removed in nitro and a hash indexed field was added.
 * For pre-nitro events the value passed in here will be used to find events with the same uniqueId.
 * For post nitro events it will be used to find events with the same hash.
 * @param indexInBatch The index in the batch, only valid for pre-nitro events. This parameter is ignored post-nitro
 * @returns Any classic and nitro events that match the provided filters.
 */
export async function getParentToChildEventsByTxHash(
  parentChainId: number,
  filter: { fromBlock: BlockTag; toBlock: BlockTag },
  position?: BigNumber,
  destination?: string,
  txHash?: string,
  indexInBatch?: BigNumber
): Promise<FetchDepositTxFromEventLogResult[]> {
  if (!txHash) {
    return []
  }
  const parentTxReceipt = await getParentTxReceipt(txHash, parentChainId)

  const parentProvider = getProviderForChainId(parentChainId)

  if (!parentTxReceipt) {
    return []
  }

  const childChainMessages = getArbitrumNetworks()
    .filter(childChain => childChain.parentChainId === parentChainId)
    .map(async childChain => {
      const childChainId = childChain.chainId
      const childProvider = getProviderForChainId(childChainId)

      // Check if any parentToChild msg is sent to the inbox of this child chain
      const logFromChildChainInbox = parentTxReceipt.logs.filter(
        log =>
          log.address.toLowerCase() === childChain.ethBridge.inbox.toLowerCase()
      )

      if (logFromChildChainInbox.length === 0) {
        return
      }

      const isClassic = await parentTxReceipt.isClassic(childProvider)

      const parentToChildMessages = isClassic
        ? await parentTxReceipt.getParentToChildMessagesClassic(childProvider)
        : await parentTxReceipt.getParentToChildMessages(childProvider)

      const ethDeposits = await parentTxReceipt.getEthDeposits(childProvider)

      const parentToChildMessageReader = parentToChildMessages[0]

      return {
        ethDeposits
      }
    })

  const messages = await Promise.all(childChainMessages)

  const allMessages = messages.reduce(
    (acc, value) => {
      if (!value) {
        return acc
      }
      return {
        // retryables: acc.retryables.concat(value.allL1ToL2Messages),
        // retryablesClassic: acc.retryablesClassic.concat(
        //   value.allL1ToL2MessagesClassic
        // ),
        ethDeposits: acc.deposits.concat(value.ethDeposits)
      }
    },
    {
      retryables: [],
      retryablesClassic: [],
      deposits: []
    } as ParentToChildMessagesAndDepositMessages
  )

  const ethTransactions: FetchDepositTxFromEventLogResult[] =
    allMessages?.ethDeposits.map(async depositMessage => {
      const timestamp = normalizeTimestamp(
        (await parentProvider.getBlock(parentTxReceipt.blockNumber)).timestamp
      )
      return {
        receiver: depositMessage.to,
        sender: depositMessage.from,
        timestamp: timestamp.toString(),
        transactionHash: depositMessage.childTxHash,
        type: 'EthDeposit',
        isClassic: false,
        id: depositMessage.childTxHash,
        ethValue: depositMessage.value.toString(),
        blockCreatedAt: parentTxReceipt.blockNumber.toString()
      } as FetchDepositTxFromEventLogResult
    })

  return {
    ethTransactions
  }
}
