import {
  fetchTokenWithdrawalsFromSubgraph,
  FetchTokenWithdrawalsFromSubgraphResult
} from './fetchTokenWithdrawalsFromSubgraph'
import { Provider } from '@ethersproject/providers'
import { fetchETHWithdrawalsFromSubgraph } from './fetchETHWithdrawalsFromSubgraph'
import {
  AssetType,
  L2ToL1EventResult,
  L2ToL1EventResultPlus,
  NodeBlockDeadlineStatus,
  OutgoingMessageState,
  WithdrawalInitiated
} from '../hooks/arbTokenBridge.types'
import { getL1TokenData, isClassicL2ToL1TransactionEvent } from '../util'
import { L2ToL1MessageReader, L2TransactionReceipt } from '@arbitrum/sdk'
import { fetchL2BlockNumberFromSubgraph } from '../util/subgraph'
import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs'
import { fetchTokenWithdrawalsFromEventLogs } from './fetchTokenWithdrawalsFromEventLogs'

export const outgoungStateToString = {
  [OutgoingMessageState.UNCONFIRMED]: 'Unconfirmed',
  [OutgoingMessageState.CONFIRMED]: 'Confirmed',
  [OutgoingMessageState.EXECUTED]: 'Executed'
}

export const fetchETHWithdrawals = async ({
  address,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock: number
  toBlock: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}) => {
  const l1ChainID = (await l1Provider.getNetwork()).chainId
  const l2ChainID = (await l2Provider.getNetwork()).chainId

  const latestSubgraphBlockNumber = await fetchL2BlockNumberFromSubgraph(
    l2ChainID
  )

  const ethWithdrawals = await fetchETHWithdrawalsFromSubgraph({
    address,
    fromBlock: 0,
    toBlock: latestSubgraphBlockNumber,
    l2Provider,
    pageSize,
    pageNumber,
    searchString
  })

  console.log('YAYYYYY, fetched ETH withdrawals')

  const l2ToL1Txns = await Promise.all(
    ethWithdrawals.map(withdrawal =>
      updateAdditionalWithdrawalData(
        withdrawal as L2ToL1EventResultPlus,
        l1Provider,
        l2Provider,
        l2ChainID
      )
    )
  )

  console.log('YAYYYYY, fetched Additional data')

  return l2ToL1Txns

  // const finalWithdrawalTxns = l2ToL1Txns.map(tx => {
  //   const uniqueIdOrHash = getUniqueIdOrHashFromEvent(tx)
  //   const isEthWithdrawal = !tx['tokenAddress']

  //   return {
  //     type: 'outbox',
  //     status:
  //       tx.nodeBlockDeadline === 'EXECUTE_CALL_EXCEPTION'
  //         ? 'Failure'
  //         : outgoungStateToString[tx.outgoingMessageState],
  //     createdAt: dayjs(
  //       new Date(BigNumber.from(tx.timestamp).toNumber() * 1000)
  //     ).format('HH:mm:ss MM/DD/YYYY'),
  //     createdAtTime:
  //       BigNumber.from(tx.timestamp).toNumber() * 1000 +
  //       (uniqueIdOrHash ? 1000 : 0), // adding 60s for the sort function so that it comes before l2 action
  //     resolvedAt: null,
  //     txId: tx.l2TxHash || 'l2-tx-hash-not-found',
  //     assetName: tx.symbol?.toLocaleLowerCase(),
  //     assetType: isEthWithdrawal ? AssetType.ETH : AssetType.ERC20,
  //     value: ethers.utils.formatUnits(tx.value?.toString(), tx.decimals),
  //     uniqueId: uniqueIdOrHash,
  //     isWithdrawal: true,
  //     blockNumber: tx.ethBlockNum.toNumber(),
  //     tokenAddress: tx.tokenAddress || null,
  //     nodeBlockDeadline: tx.nodeBlockDeadline,
  //     sender: address,
  //     l1NetworkID: String(l1ChainID),
  //     l2NetworkID: String(l2ChainID)
  //   } as unknown as Transaction
  // })

  // console.log('YAYYYYY, final ETH withdrawal done', finalWithdrawalTxns)

  // return finalWithdrawalTxns
}

export const fetchTokenWithdrawals = async ({
  address,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock: number
  toBlock: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}) => {
  const l2ChainID = (await l2Provider.getNetwork()).chainId

  const latestSubgraphBlockNumber = await fetchL2BlockNumberFromSubgraph(
    l2ChainID
  )

  const tokenWithdrawals = await fetchTokenWithdrawalsFromSubgraph({
    address,
    fromBlock: 0,
    toBlock: latestSubgraphBlockNumber,
    l2Provider,
    pageSize,
    pageNumber,
    searchString
  })

  console.log('YAYYYYY, fetched Token withdrawals')

  const l2ToL1Txns = await Promise.all(
    tokenWithdrawals.map(withdrawal =>
      updateAdditionalWithdrawalData(
        withdrawal,
        l1Provider,
        l2Provider,
        l2ChainID
      )
    )
  )

  console.log('YAYYYYY, fetched additional data for token withdrawals')

  return l2ToL1Txns
}

export const updateAdditionalWithdrawalData = async (
  withdrawalTx: L2ToL1EventResultPlus | FetchTokenWithdrawalsFromSubgraphResult,
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainID: number
) => {
  const isEthWithdrawal = !withdrawalTx['tokenAddress']

  let l2ToL1EventResult

  if (isEthWithdrawal) {
    l2ToL1EventResult = await mapETHWithdrawalToL2ToL1EventResult(
      withdrawalTx,
      l1Provider,
      l2Provider,
      l2ChainID
    )
  } else {
    l2ToL1EventResult = await mapTokenWithdrawalFromSubgraphToL2ToL1EventResult(
      withdrawalTx as FetchTokenWithdrawalsFromSubgraphResult,
      l1Provider,
      l2Provider,
      l2ChainID
    )
  }

  const l2toL1TxWithDeadline = await attachNodeBlockDeadlineToEvent(
    l2ToL1EventResult,
    l1Provider,
    l2Provider
  )

  return l2toL1TxWithDeadline
}

export async function mapETHWithdrawalToL2ToL1EventResult(
  // `l2TxHash` exists on result from subgraph
  // `transactionHash` exists on result from event logs
  event: L2ToL1EventResult & { l2TxHash?: string; transactionHash?: string },
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainId: number
): Promise<L2ToL1EventResultPlus> {
  const { callvalue } = event
  const outgoingMessageState = await getOutgoingMessageState(
    event,
    l1Provider,
    l2Provider,
    l2ChainId
  )

  return {
    ...event,
    type: AssetType.ETH,
    value: callvalue,
    symbol: 'ETH',
    outgoingMessageState,
    decimals: 18,
    l2TxHash: event.l2TxHash || event.transactionHash
  }
}

export async function mapTokenWithdrawalFromSubgraphToL2ToL1EventResult(
  result: FetchTokenWithdrawalsFromSubgraphResult,
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainId: number
): Promise<L2ToL1EventResultPlus> {
  const { symbol, decimals } = await getL1TokenData({
    account: result.caller,
    erc20L1Address: result.tokenAddress!,
    l1Provider,
    l2Provider
  })

  const outgoingMessageState = await getOutgoingMessageState(
    result,
    l1Provider,
    l2Provider,
    l2ChainId
  )

  return {
    ...result,
    value: result.amount,
    type: AssetType.ERC20,
    symbol,
    decimals,
    outgoingMessageState
  }
}

export async function getOutgoingMessageState(
  event: L2ToL1EventResult,
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainID: number
) {
  const cacheKey = getExecutedMessagesCacheKey({
    event,
    l2ChainId: l2ChainID
  })

  const executedMessagesCache = JSON.parse(
    localStorage.getItem('arbitrum:bridge:executed-messages') || '{}'
  )
  if (executedMessagesCache[cacheKey]) {
    return OutgoingMessageState.EXECUTED
  }

  const messageReader = new L2ToL1MessageReader(l1Provider, event)

  try {
    return await messageReader.status(l2Provider)
  } catch (error) {
    return OutgoingMessageState.UNCONFIRMED
  }
}

export function getExecutedMessagesCacheKey({
  event,
  l2ChainId
}: {
  event: L2ToL1EventResult
  l2ChainId: number
}) {
  return isClassicL2ToL1TransactionEvent(event)
    ? `l2ChainId: ${l2ChainId}, batchNumber: ${event.batchNumber.toString()}, indexInBatch: ${event.indexInBatch.toString()}`
    : `l2ChainId: ${l2ChainId}, position: ${event.position.toString()}`
}

async function attachNodeBlockDeadlineToEvent(
  event: L2ToL1EventResultPlus,
  l1Provider: Provider,
  l2Provider: Provider
) {
  if (
    event.outgoingMessageState === OutgoingMessageState.EXECUTED ||
    event.outgoingMessageState === OutgoingMessageState.CONFIRMED
  ) {
    return event
  }

  const messageReader = L2ToL1MessageReader.fromEvent(l1Provider, event)

  try {
    const firstExecutableBlock = await messageReader.getFirstExecutableBlock(
      l2Provider
    )

    return { ...event, nodeBlockDeadline: firstExecutableBlock?.toNumber() }
  } catch (e) {
    const expectedError = "batch doesn't exist"
    const expectedError2 = 'CALL_EXCEPTION'
    const err = e as Error & { error: Error }
    const actualError = err && (err.message || (err.error && err.error.message))
    if (actualError.includes(expectedError)) {
      const nodeBlockDeadline: NodeBlockDeadlineStatus = 'NODE_NOT_CREATED'
      return {
        ...event,
        nodeBlockDeadline
      }
    } else if (actualError.includes(expectedError2)) {
      // in classic we simulate `executeTransaction` in `hasExecuted`
      // which might revert if the L2 to L1 call fail
      const nodeBlockDeadline: NodeBlockDeadlineStatus =
        'EXECUTE_CALL_EXCEPTION'
      return {
        ...event,
        nodeBlockDeadline
      }
    } else {
      throw e
    }
  }
}

async function tryFetchLatestSubgraphBlockNumber(
  l2ChainID: number
): Promise<number> {
  try {
    return await fetchL2BlockNumberFromSubgraph(l2ChainID)
  } catch (error) {
    // In case the subgraph is not supported or down, fall back to fetching everything through event logs
    return 0
  }
}

async function mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
  result: WithdrawalInitiated,
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainID: number,
  walletAddress: string
): Promise<L2ToL1EventResultPlus | undefined> {
  const { symbol, decimals } = await getL1TokenData({
    account: walletAddress,
    erc20L1Address: result.l1Token!,
    l1Provider,
    l2Provider
  })

  const txReceipt = await l2Provider.getTransactionReceipt(result.txHash)
  const l2TxReceipt = new L2TransactionReceipt(txReceipt)

  // TODO: length != 1
  const [event] = l2TxReceipt.getL2ToL1Events()

  if (!event) {
    return undefined
  }

  const outgoingMessageState = await getOutgoingMessageState(
    event,
    l1Provider,
    l2Provider,
    l2ChainID
  )

  return {
    ...event,
    type: AssetType.ERC20,
    value: result._amount,
    tokenAddress: result.l1Token,
    outgoingMessageState,
    symbol,
    decimals,
    l2TxHash: l2TxReceipt.transactionHash
  }
}

export const fetchWithdrawals = async ({
  address, // wallet address
  l1Provider,
  l2Provider,
  gatewayAddresses,
  pageNumber = 0,
  pageSize,
  searchString
}: {
  address: string
  l1Provider: Provider
  l2Provider: Provider
  gatewayAddresses: string[]
  pageNumber?: number
  pageSize?: number
  searchString?: string
}) => {
  const l1ChainID = (await l1Provider.getNetwork()).chainId
  const l2ChainID = (await l2Provider.getNetwork()).chainId

  const t = new Date().getTime()

  console.log('*** Getting initial pending withdrawal data ***')

  const latestSubgraphBlockNumber = await tryFetchLatestSubgraphBlockNumber(
    l2ChainID
  )

  console.log(
    'Latest block number on L2 from subgraph:',
    latestSubgraphBlockNumber
  )

  const [
    ethWithdrawalsFromSubgraph,
    ethWithdrawalsFromEventLogs,
    tokenWithdrawalsFromSubgraph,
    tokenWithdrawalsFromEventLogs
  ] = await Promise.all([
    // ETH Withdrawals
    fetchETHWithdrawalsFromSubgraph({
      address: address,
      fromBlock: 0,
      toBlock: latestSubgraphBlockNumber,
      l2Provider: l2Provider,
      pageNumber,
      pageSize,
      searchString
    }),
    fetchETHWithdrawalsFromEventLogs({
      address: address,
      fromBlock: latestSubgraphBlockNumber + 1,
      toBlock: 'latest',
      l2Provider: l2Provider
    }),
    // Token Withdrawals
    fetchTokenWithdrawalsFromSubgraph({
      address: address,
      fromBlock: 0,
      toBlock: latestSubgraphBlockNumber,
      l2Provider: l2Provider,
      pageNumber,
      pageSize,
      searchString
    }),
    fetchTokenWithdrawalsFromEventLogs({
      address: address,
      fromBlock: latestSubgraphBlockNumber + 1,
      toBlock: 'latest',
      l2Provider: l2Provider,
      l2GatewayAddresses: gatewayAddresses
    })
  ])

  const l2ToL1Txns = (
    await Promise.all([
      ...ethWithdrawalsFromSubgraph.map(withdrawal =>
        mapETHWithdrawalToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID
        )
      ),
      ...ethWithdrawalsFromEventLogs.map(withdrawal =>
        mapETHWithdrawalToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID
        )
      ),
      ...tokenWithdrawalsFromSubgraph.map(withdrawal =>
        mapTokenWithdrawalFromSubgraphToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID
        )
      ),
      ...tokenWithdrawalsFromEventLogs.map(withdrawal =>
        mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID,
          address
        )
      )
    ])
  )
    .filter((msg): msg is L2ToL1EventResultPlus => typeof msg !== 'undefined')
    .sort((msgA, msgB) => +msgA.timestamp - +msgB.timestamp)

  const finalL2ToL1Txns = await Promise.all(
    l2ToL1Txns.map(withdrawal =>
      updateAdditionalWithdrawalData(
        withdrawal,
        l1Provider,
        l2Provider,
        l2ChainID
      )
    )
  )

  console.log(
    `*** done getting pending withdrawals and additional data, took ${
      Math.round(new Date().getTime() - t) / 1000
    } seconds`
  )

  return finalL2ToL1Txns as L2ToL1EventResultPlus[]
}
