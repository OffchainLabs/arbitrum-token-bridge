import { Provider, BlockTag } from '@ethersproject/providers'
import { withTimeout } from '../withTimeout'

export interface BatchRangeProcessingOptions {
  maxRange?: number
  parallelRequestSize?: number
  timeoutMs?: number
  logPrefix?: string
}

export interface BlockRange {
  fromBlock: number
  toBlock: number
  index: number
}

/**
 * Generic function that processes large block ranges by splitting them into chunks
 * and processing them in parallel batches.
 *
 * @param queryParams Parameters for the query
 * @param queryParams.fromBlock Start block number
 * @param queryParams.toBlock End block number (can be 'latest')
 * @param queryParams.provider Provider for getting latest block number
 * @param queryParams.fetchFunction Async function that fetches data for a block range
 * @param queryParams.options Configuration options for batch processing
 */
export async function withBatchRangeProcessing<T>({
  fromBlock,
  toBlock,
  provider,
  fetchFunction,
  options = {}
}: {
  fromBlock: BlockTag
  toBlock: BlockTag
  provider: Provider
  fetchFunction: (fromBlock: number, toBlock: number) => Promise<T[]>
  options?: BatchRangeProcessingOptions
}): Promise<T[]> {
  const {
    maxRange = 10_000,
    parallelRequestSize = 3,
    timeoutMs,
    logPrefix = '[withBatchRangeProcessing]'
  } = options

  const chainId = await provider.getNetwork().then(network => network.chainId)
  const latestBlockNumber = await provider.getBlockNumber()

  console.log(`${logPrefix} Chain ID: ${chainId}`)
  console.log(`${logPrefix} Input params:`, {
    fromBlock,
    toBlock,
    latestBlockNumber,
    maxRange,
    parallelRequestSize
  })

  const fromBlockNumber =
    typeof fromBlock === 'number' ? fromBlock : parseInt(fromBlock.toString())
  const toBlockNumber =
    toBlock === 'latest'
      ? latestBlockNumber
      : typeof toBlock === 'number'
      ? toBlock
      : parseInt(toBlock.toString())

  const blockRange = toBlockNumber - fromBlockNumber

  console.log(`${logPrefix} Block range: ${blockRange} (max: ${maxRange})`)

  if (blockRange <= maxRange) {
    // Use single query if range is within limits
    console.log(
      `${logPrefix} Using single query for range ${fromBlockNumber} to ${toBlockNumber}`
    )
    return await withTimeout(
      fetchFunction(fromBlockNumber, toBlockNumber),
      timeoutMs
    )
  }

  // Apply chunking for large ranges
  const allResults: T[] = []
  const finalToBlock = Math.min(toBlockNumber, latestBlockNumber)

  console.log(
    `${logPrefix} Using chunking for large range: ${fromBlockNumber} to ${finalToBlock}`
  )

  // Generate all chunk ranges
  const chunkRanges: BlockRange[] = []
  let currentFromBlock = fromBlockNumber
  let chunkIndex = 0

  while (currentFromBlock <= finalToBlock) {
    const currentToBlock = Math.min(
      currentFromBlock + maxRange - 1,
      finalToBlock
    )
    chunkRanges.push({
      fromBlock: currentFromBlock,
      toBlock: currentToBlock,
      index: ++chunkIndex
    })
    currentFromBlock = currentToBlock + 1
  }

  console.log(`${logPrefix} Total chunks: ${chunkRanges.length}`)

  // Process chunks in parallel batches
  for (let i = 0; i < chunkRanges.length; i += parallelRequestSize) {
    const batch = chunkRanges.slice(i, i + parallelRequestSize)
    console.log(
      `${logPrefix} Processing batch ${
        Math.floor(i / parallelRequestSize) + 1
      }: chunks ${i + 1}-${Math.min(
        i + parallelRequestSize,
        chunkRanges.length
      )}`
    )

    const batchPromises = batch.map(async ({ fromBlock, toBlock, index }) => {
      try {
        console.log(
          `${logPrefix} Chunk ${index}: blocks ${fromBlock} to ${toBlock}`
        )
        const chunkResults = await withTimeout(
          fetchFunction(fromBlock, toBlock),
          timeoutMs
        )
        console.log(
          `${logPrefix} Chunk ${index} returned ${chunkResults.length} results`
        )
        return chunkResults
      } catch (error) {
        console.warn(
          `${logPrefix} Failed to fetch results from block ${fromBlock} to ${toBlock}:`,
          error
        )
        return []
      }
    })

    const batchResults = await Promise.all(batchPromises)
    allResults.push(...batchResults.flat())
  }

  console.log(
    `${logPrefix} Completed chunking. Total results: ${allResults.length}`
  )
  return allResults
}
