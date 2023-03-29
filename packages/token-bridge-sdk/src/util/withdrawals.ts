import { Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import {
  AssetType,
  L2ToL1EventResult,
  L2ToL1EventResultPlus,
  NodeBlockDeadlineStatus,
  NodeBlockDeadlineStatusTypes,
  OutgoingMessageState,
  WithdrawalInitiated
} from '../hooks/arbTokenBridge.types'
import { getL1TokenData, isClassicL2ToL1TransactionEvent } from '../util'
import { L2ToL1MessageReader, L2TransactionReceipt } from '@arbitrum/sdk'
import { FetchWithdrawalsFromSubgraphResult } from 'withdrawals/fetchWithdrawalsFromSubgraph'

export const updateAdditionalWithdrawalData = async (
  withdrawalTx: L2ToL1EventResultPlus,
  l1Provider: Provider,
  l2Provider: Provider
) => {
  const l2toL1TxWithDeadline = await attachNodeBlockDeadlineToEvent(
    withdrawalTx as L2ToL1EventResultPlus,
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

export async function attachNodeBlockDeadlineToEvent(
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
    const errorMessage = err && (err.message || err.error?.message)

    if (errorMessage.includes(expectedError)) {
      const nodeBlockDeadline: NodeBlockDeadlineStatus =
        NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED
      return {
        ...event,
        nodeBlockDeadline
      }
    } else if (errorMessage.includes(expectedError2)) {
      // in classic we simulate `executeTransaction` in `hasExecuted`
      // which might revert if the L2 to L1 call fail
      const nodeBlockDeadline: NodeBlockDeadlineStatus =
        NodeBlockDeadlineStatusTypes.EXECUTE_CALL_EXCEPTION
      return {
        ...event,
        nodeBlockDeadline
      }
    } else {
      throw e
    }
  }
}

export async function mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
  result: WithdrawalInitiated,
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainID: number,
  walletAddress: string
): Promise<L2ToL1EventResultPlus | undefined> {
  const { symbol, decimals } = await getL1TokenData({
    account: walletAddress,
    erc20L1Address: result.l1Token,
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

export async function mapWithdrawalToL2ToL1EventResult(
  // `l2TxHash` exists on result from subgraph
  // `transactionHash` exists on result from event logs
  withdrawal: FetchWithdrawalsFromSubgraphResult,
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainId: number
): Promise<L2ToL1EventResultPlus | undefined> {
  // get transaction receipt

  const txReceipt = await l2Provider.getTransactionReceipt(withdrawal.l2TxHash)
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
    l2ChainId
  )

  if (withdrawal.type === 'TokenWithdrawal' && withdrawal?.l1Token?.id) {
    // Token withdrawal
    const { symbol, decimals } = await getL1TokenData({
      account: withdrawal.sender,
      erc20L1Address: withdrawal.l1Token.id,
      l1Provider,
      l2Provider
    })
    return {
      ...event,
      type: AssetType.ERC20,
      value: BigNumber.from(withdrawal.tokenAmount),
      tokenAddress: withdrawal.l1Token.id,
      outgoingMessageState,
      symbol,
      decimals,
      l2TxHash: l2TxReceipt.transactionHash
    } as L2ToL1EventResultPlus
  }

  // Else, Eth withdrawal
  return {
    ...event,
    type: AssetType.ETH,
    value: BigNumber.from(withdrawal.ethValue),
    outgoingMessageState,
    l2TxHash: l2TxReceipt.transactionHash,
    symbol: 'ETH',
    decimals: 18
  } as L2ToL1EventResultPlus
}

export async function getOutgoingMessageStateFromTxHash({
  txHash,
  l2Provider,
  l1Provider,
  l2ChainID
}: {
  txHash: string
  l2Provider: Provider
  l1Provider: Provider
  l2ChainID: number
}) {
  const txReceipt = await l2Provider.getTransactionReceipt(txHash)
  const l2TxReceipt = new L2TransactionReceipt(txReceipt)
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

  return outgoingMessageState
}
