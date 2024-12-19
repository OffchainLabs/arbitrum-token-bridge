import { BigNumber } from 'ethers'
import { BlockTag } from '@ethersproject/providers'
import { EthDepositMessage, getArbitrumNetworks } from '@arbitrum/sdk'

import { getParentTxReceipt } from '../helpers'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { normalizeTimestamp } from '../../../state/app/utils'

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

  // to test for child chain, filter chains that has this parent chain id as parent
  // and then loop through it.............
  const childChains = getArbitrumNetworks()
        .filter(childChain => childChain.parentChainId === parentChainId)
        .map(network => network.chainId)

  parentTxReceipt.

  const parentToChildMessages = isClassic
    ? await parentTxReceipt.getParentToChildMessagesClassic(childProvider)
    : await parentTxReceipt.getParentToChildMessages(childProvider)

  const parentToChildMessageReader = parentToChildMessages[0]

  if (!parentToChildMessageReader) {
    return []
  }

  const ethDeposits = await parentTxReceipt.getEthDeposits(childProvider)

  const timestamp = normalizeTimestamp(
    (await parentProvider.getBlock(parentTxReceipt.blockNumber)).timestamp
  )

  const ethTransactions: FetchDepositTxFromEventLogResult[] = ethDeposits.map(
    async depositMessage => {
      const childProvider = getProviderForChainId(depositMessage.childChainId)

      const isClassic = await parentTxReceipt.isClassic(childProvider)

      return {
        receiver: depositMessage.to,
        sender: depositMessage.from,
        timestamp,
        transactionHash: depositMessage.
        type: 'EthDeposit',
        isClassic,
        ethValue: depositMessage.value.toString(),
        blockCreatedAt: parentTxReceipt.blockNumber.toString()
      }
    }
  )

  return transaction
}
