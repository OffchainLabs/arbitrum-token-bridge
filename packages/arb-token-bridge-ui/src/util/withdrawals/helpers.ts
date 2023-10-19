import { utils } from 'ethers'
import { Provider, getNetwork } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import { L2ToL1MessageReader, L2TransactionReceipt } from '@arbitrum/sdk'
import { FetchWithdrawalsFromSubgraphResult } from './fetchWithdrawalsFromSubgraph'
import { getL1TokenData } from '../TokenUtils'
import {
  AssetType,
  L2ToL1EventResult,
  L2ToL1EventResultPlus,
  NodeBlockDeadlineStatus,
  NodeBlockDeadlineStatusTypes,
  OutgoingMessageState,
  WithdrawalInitiated
} from '../../hooks/arbTokenBridge.types'
import { getExecutedMessagesCacheKey } from '../../hooks/useArbTokenBridge'

/**
 * `l2TxHash` exists on result from subgraph
 * `transactionHash` exists on result from event logs
 */
export type EthWithdrawal = L2ToL1EventResult & {
  l2TxHash?: string
  transactionHash?: string
}

export const updateAdditionalWithdrawalData = async (
  withdrawalTx: L2ToL1EventResultPlus,
  l1Provider: Provider,
  l2Provider: Provider
) => {
  console.log({ withdrawalTx })
  const l2toL1TxWithDeadline = await attachNodeBlockDeadlineToEvent(
    withdrawalTx as L2ToL1EventResultPlus,
    l1Provider,
    l2Provider
  )

  return l2toL1TxWithDeadline
}

export async function attachTimestampToTokenWithdrawal({
  withdrawal,
  l2Provider
}: {
  withdrawal: WithdrawalInitiated
  l2Provider: Provider
}) {
  return {
    ...withdrawal,
    // TODO: arbitrary number, need changes to the SDK to get token withdrawal timestamp
    timestamp: BigNumber.from(1665914495)
  }
  const txReceipt = await l2Provider.getTransactionReceipt(withdrawal.txHash)
  const l2TxReceipt = new L2TransactionReceipt(txReceipt)
  const [event] = l2TxReceipt.getL2ToL1Events()

  return {
    ...withdrawal,
    timestamp: event?.timestamp
  }
}

/**
 * `l2TxHash` exists on result from subgraph
 * `transactionHash` exists on result from event logs
 */
export async function mapETHWithdrawalToL2ToL1EventResult(
  event: EthWithdrawal,
  l1Provider: Provider,
  l2Provider: Provider,
  l1ChainId: number,
  l2ChainId: number
): Promise<L2ToL1EventResultPlus> {
  const { callvalue } = event
  console.log('ethevent: ', event)
  const outgoingMessageState = await getOutgoingMessageState(
    event,
    l1Provider,
    l2Provider,
    l2ChainId
  )

  return {
    ...event,
    sender: event.caller,
    destinationAddress: event.destination,
    type: AssetType.ETH,
    value: callvalue,
    symbol: 'ETH',
    outgoingMessageState,
    decimals: 18,
    l2TxHash: event.l2TxHash || event.transactionHash,
    parentChainId: l1ChainId,
    chainId: l2ChainId
  }
}

export async function getOutgoingMessageState(
  event: L2ToL1EventResult,
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainID: number
) {
  console.log('HERE')
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

  console.log({ event })

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

export function isTokenWithdrawal(
  withdrawal: WithdrawalInitiated | EthWithdrawal
): withdrawal is WithdrawalInitiated {
  return typeof (withdrawal as WithdrawalInitiated).l1Token !== 'undefined'
}

export async function mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
  result: WithdrawalInitiated,
  l1Provider: Provider,
  l2Provider: Provider,
  l1ChainID: number,
  l2ChainID: number
): Promise<L2ToL1EventResultPlus | undefined> {
  console.log('TOKENL1', result.l1Token)
  const { symbol, decimals } = await getL1TokenData({
    // we don't care about allowance in this call, so we're just using vitalik.eth
    // didn't want to use address zero in case contracts have checks for it
    account: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
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

  // We cannot access sender and destination from the withdrawal object.
  // We have to get them from the receipt logs.
  //
  // Get hash of the topic that contains sender and destination.
  const signatureHash = utils.id(
    'TransferRouted(address,address,address,address)'
  )
  // Searching logs for the topic.
  const logs = txReceipt.logs.find(log => {
    if (!log) {
      return false
    }
    return log.topics[0] === signatureHash
  })

  // We can directly access them by index, these won't change.
  let sender = logs?.topics[2]
  let destinationAddress = logs?.topics[3]

  // SCW relayer won't return leading zeros, but we will get them when using EOA.
  if (sender && !utils.isAddress(sender)) {
    // Strips leading zeros if necessary.
    sender = '0x' + sender.slice(-40)
  }

  if (destinationAddress && !utils.isAddress(destinationAddress)) {
    // Strips leading zeros if necessary.
    destinationAddress = '0x' + destinationAddress.slice(-40)
  }

  return {
    ...event,
    sender,
    destinationAddress,
    type: AssetType.ERC20,
    value: result._amount,
    tokenAddress: result.l1Token,
    outgoingMessageState,
    symbol,
    decimals,
    l2TxHash: l2TxReceipt.transactionHash,
    parentChainId: l1ChainID,
    chainId: l2ChainID
  }
}

export async function mapWithdrawalToL2ToL1EventResult(
  withdrawal: FetchWithdrawalsFromSubgraphResult,
  l1Provider: Provider,
  l2Provider: Provider,
  l1ChainId: number,
  l2ChainId: number
): Promise<L2ToL1EventResultPlus | undefined> {
  // get transaction receipt

  console.log('rec: ', withdrawal.l2TxHash)
  console.log({ l2Provider })
  const txReceipt = await l2Provider.getTransactionReceipt(withdrawal.l2TxHash)
  console.log({ txReceipt })
  const l2TxReceipt = new L2TransactionReceipt(txReceipt)
  console.log({ l2TxReceipt })

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
      sender: withdrawal.sender,
      destinationAddress: withdrawal.receiver,
      type: AssetType.ERC20,
      value: BigNumber.from(withdrawal.tokenAmount),
      tokenAddress: withdrawal.l1Token.id,
      outgoingMessageState,
      symbol,
      decimals,
      l2TxHash: l2TxReceipt.transactionHash,
      parentChainId: l1ChainId,
      chainId: l2ChainId
    } as L2ToL1EventResultPlus
  }

  // Else, Eth withdrawal
  return {
    ...event,
    sender: withdrawal.sender,
    destinationAddress: withdrawal.receiver,
    type: AssetType.ETH,
    value: BigNumber.from(withdrawal.ethValue),
    outgoingMessageState,
    l2TxHash: l2TxReceipt.transactionHash,
    symbol: 'ETH',
    decimals: 18,
    parentChainId: l1ChainId,
    chainId: l2ChainId
  } as L2ToL1EventResultPlus
}
