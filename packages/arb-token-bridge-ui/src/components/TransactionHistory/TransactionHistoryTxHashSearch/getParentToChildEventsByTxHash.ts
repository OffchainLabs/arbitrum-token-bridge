import { BigNumber } from 'ethers'
import { BlockTag } from '@ethersproject/providers'

import { getParentTxReceipt } from '../helpers'

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
  childChainId: number,
  filter: { fromBlock: BlockTag; toBlock: BlockTag },
  position?: BigNumber,
  destination?: string,
  txHash?: string,
  indexInBatch?: BigNumber
): Promise<(ParentToChildTransactionEvent & { transactionHash: string })[]> {
  if (!txHash) {
    return []
  }
  const getParentTxReceiptResult = await getParentTxReceipt(
    txHash,
    childChainId
  )

  const childChain = await getArbitrumNetwork(childProvider)
  const childNitroGenesisBlock = getNitroGenesisBlock(childChain)

  const inClassicRange = (blockTag: BlockTag, nitroGenBlock: number) => {
    if (typeof blockTag === 'string') {
      // taking classic of "earliest", "latest", "earliest" and the nitro gen block
      // yields 0, nitro gen, nitro gen since the classic range is always between 0 and nitro gen

      switch (blockTag) {
        case 'earliest':
          return 0
        case 'latest':
          return nitroGenBlock
        case 'pending':
          return nitroGenBlock
        default:
          throw new Error(`Unrecognised block tag. ${blockTag}`)
      }
    }
    return Math.min(blockTag, nitroGenBlock)
  }

  const inNitroRange = (blockTag: BlockTag, nitroGenBlock: number) => {
    // taking nitro range of "earliest", "latest", "earliest" and the nitro gen block
    // yields nitro gen, latest, pending since the nitro range is always between nitro gen and latest/pending

    if (typeof blockTag === 'string') {
      switch (blockTag) {
        case 'earliest':
          return nitroGenBlock
        case 'latest':
          return 'latest'
        case 'pending':
          return 'pending'
        default:
          throw new Error(`Unrecognised block tag. ${blockTag}`)
      }
    }

    return Math.max(blockTag, nitroGenBlock)
  }

  // only fetch nitro events after the genesis block
  const classicFilter = {
    fromBlock: inClassicRange(filter.fromBlock, childNitroGenesisBlock),
    toBlock: inClassicRange(filter.toBlock, childNitroGenesisBlock)
  }
  const logQueries = []
  if (classicFilter.fromBlock !== classicFilter.toBlock) {
    logQueries.push(
      classic.ChildToParentMessageClassic.getChildToParentEvents(
        childProvider,
        classicFilter,
        position,
        destination,
        hash,
        indexInBatch
      )
    )
  }

  const nitroFilter = {
    fromBlock: inNitroRange(filter.fromBlock, childNitroGenesisBlock),
    toBlock: inNitroRange(filter.toBlock, childNitroGenesisBlock)
  }
  if (nitroFilter.fromBlock !== nitroFilter.toBlock) {
    logQueries.push(
      nitro.ChildToParentMessageNitro.getChildToParentEvents(
        childProvider,
        nitroFilter,
        position,
        destination,
        hash
      )
    )
  }

  return (await Promise.all(logQueries)).flat(1)
}
