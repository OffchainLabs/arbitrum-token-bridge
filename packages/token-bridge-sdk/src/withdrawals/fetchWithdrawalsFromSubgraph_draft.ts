import {
  fetchTokenWithdrawalsFromSubgraph,
  FetchTokenWithdrawalsFromSubgraphResult
} from './fetchTokenWithdrawalsFromSubgraph'
import dayjs from 'dayjs'
import { ethers, BigNumber } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { fetchETHWithdrawalsFromSubgraph } from './fetchETHWithdrawalsFromSubgraph'
import {
  AssetType,
  L2ToL1EventResult,
  L2ToL1EventResultPlus,
  NodeBlockDeadlineStatus,
  OutgoingMessageState
} from '../hooks/arbTokenBridge.types'
import { getL1TokenData, isClassicL2ToL1TransactionEvent } from '../util'
import { L2ToL1MessageReader } from '@arbitrum/sdk'
import {
  L1ToL2MessageData,
  L2ToL1MessageData,
  Transaction,
  TxnType
} from 'hooks/useTransactions'
import { getUniqueIdOrHashFromEvent } from '../util/migration'

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

  const ethWithdrawals = await fetchETHWithdrawalsFromSubgraph({
    address,
    fromBlock,
    toBlock,
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

// export const fetchTokenWithdrawals = async ({
//   address,
//   fromBlock,
//   toBlock,
//   l1Provider,
//   l2Provider
// }: {
//   address: string
//   fromBlock: number
//   toBlock: number
//   l1Provider: Provider
//   l2Provider: Provider
// }) => {
//   const l2ChainID = (await l2Provider.getNetwork()).chainId

//   const ethWithdrawals = await fetchTokenWithdrawalsFromSubgraph({
//     address,
//     fromBlock,
//     toBlock,
//     l2Provider
//   })

//   console.log('YAYYYYY, fetched ETH withdrawals')

//   const l2ToL1Txns = await Promise.all(
//     ethWithdrawals.map(withdrawal =>
//       updateAdditionalWithdrawalData(
//         withdrawal,
//         l1Provider,
//         l2Provider,
//         l2ChainID
//       )
//     )
//   )

//   return transformWithdrawals(l2ToL1Txns)
// }

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

async function mapETHWithdrawalToL2ToL1EventResult(
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

async function mapTokenWithdrawalFromSubgraphToL2ToL1EventResult(
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
