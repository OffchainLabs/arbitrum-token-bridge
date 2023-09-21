import { utils } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import { L2ToL1MessageReader, L2TransactionReceipt } from '@arbitrum/sdk'
import dayjs from 'dayjs'

import { FetchWithdrawalsFromSubgraphResult } from './fetchWithdrawalsFromSubgraph'
import { getL1TokenData } from '../TokenUtils'
import {
  AssetType,
  L2ToL1EventResult,
  L2ToL1EventResultPlus,
  OutgoingMessageState,
  WithdrawalInitiated
} from '../../hooks/arbTokenBridge.types'
import { getL2ToL1MessageCacheKey } from '../../hooks/useArbTokenBridge'
import { isNetwork } from '../networks'
import { getTxConfirmationRemainingMinutes } from '../../components/common/WithdrawalCountdown'

const FAILED_MESSAGES_LOCAL_STORAGE_KEY = 'arbitrum:bridge:failed-messages'
const EXECUTED_MESSAGES_LOCAL_STORAGE_KEY = 'arbitrum:bridge:executed-messages'

export async function mapETHWithdrawalToL2ToL1EventResult(
  // `l2TxHash` exists on result from subgraph
  // `transactionHash` exists on result from event logs
  event: L2ToL1EventResult & { l2TxHash?: string; transactionHash?: string },
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainId: number
): Promise<L2ToL1EventResultPlus> {
  const { callvalue } = event
  const failed = await isWithdrawalFailed({
    event,
    l1Provider,
    l2Provider,
    l2ChainId
  })

  const outgoingMessageState = failed
    ? OutgoingMessageState.UNCONFIRMED
    : await getOutgoingMessageState(event, l1Provider, l2Provider, l2ChainId)

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
    failed
  }
}

async function isWithdrawalFailed({
  event,
  l1Provider,
  l2Provider,
  l2ChainId
}: {
  event: L2ToL1EventResult & { l2TxHash?: string; transactionHash?: string }
  l1Provider: Provider
  l2Provider: Provider
  l2ChainId: number
}) {
  const cacheKey = getL2ToL1MessageCacheKey({
    event,
    l2ChainId
  })

  // cached status is failure
  const failedMessagesCache = JSON.parse(
    localStorage.getItem(FAILED_MESSAGES_LOCAL_STORAGE_KEY) || '{}'
  )
  if (failedMessagesCache[cacheKey] === true) {
    return true
  }

  const messageReader = new L2ToL1MessageReader(l1Provider, event)

  // no cached status for this tx
  // we check if the transaction has failed
  if (typeof failedMessagesCache[cacheKey] === 'undefined') {
    try {
      await messageReader.getFirstExecutableBlock(l2Provider)
      saveFailedMessageToCache(cacheKey, false)
      return false
    } catch (error) {
      const err = error as Error & { error: Error }
      const errorMessage = err && (err.message || err.error?.message)

      if (errorMessage.includes('CALL_EXCEPTION')) {
        // in classic we simulate `executeTransaction` in `hasExecuted`
        // which might revert if the L2 to L1 call fail
        saveFailedMessageToCache(cacheKey, true)
        return true
      } else {
        throw error
      }
    }
  }

  return false
}

function saveFailedMessageToCache(key: string, failed: boolean) {
  const currentCache = JSON.parse(
    localStorage.getItem(FAILED_MESSAGES_LOCAL_STORAGE_KEY) || '{}'
  )
  localStorage.setItem(
    FAILED_MESSAGES_LOCAL_STORAGE_KEY,
    JSON.stringify({ ...currentCache, [key]: failed })
  )
}

function saveExecutedMessageToCache(key: string) {
  const currentCache = JSON.parse(
    localStorage.getItem(EXECUTED_MESSAGES_LOCAL_STORAGE_KEY) || '{}'
  )
  localStorage.setItem(
    EXECUTED_MESSAGES_LOCAL_STORAGE_KEY,
    JSON.stringify({ ...currentCache, [key]: true })
  )
}

export async function getOutgoingMessageState(
  event: L2ToL1EventResult,
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainID: number
) {
  const cacheKey = getL2ToL1MessageCacheKey({
    event,
    l2ChainId: l2ChainID
  })

  // cached status is executed
  const executedMessagesCache = JSON.parse(
    localStorage.getItem(EXECUTED_MESSAGES_LOCAL_STORAGE_KEY) || '{}'
  )
  if (executedMessagesCache[cacheKey]) {
    return OutgoingMessageState.EXECUTED
  }

  const messageReader = new L2ToL1MessageReader(l1Provider, event)

  const l1Network = await l1Provider.getNetwork()
  const { isMainnet } = isNetwork(l1Network.chainId)

  const minutesLeft = getTxConfirmationRemainingMinutes({
    createdAt: dayjs(event.timestamp.toNumber() * 1000),
    parentChainId: l1Network.chainId
  })
  const FOUR_HOURS_IN_MINUTES = 4 * 60

  // assume tx is unconfirmed if the confirmation time is a long time way
  const isUnconfirmedMainnet = isMainnet && minutesLeft > FOUR_HOURS_IN_MINUTES
  const isUnconfirmedNotMainnet = !isMainnet && minutesLeft > 30

  if (isUnconfirmedMainnet || isUnconfirmedNotMainnet) {
    return OutgoingMessageState.UNCONFIRMED
  }

  // finally get other possible status
  try {
    const status = await messageReader.status(l2Provider)

    if (status === OutgoingMessageState.EXECUTED) {
      saveExecutedMessageToCache(cacheKey)
    }
    return status
  } catch (error) {
    return OutgoingMessageState.UNCONFIRMED
  }
}

export async function mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
  result: WithdrawalInitiated,
  l1Provider: Provider,
  l2Provider: Provider,
  l2ChainID: number
): Promise<L2ToL1EventResultPlus | undefined> {
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
      sender: withdrawal.sender,
      destinationAddress: withdrawal.receiver,
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
    sender: withdrawal.sender,
    destinationAddress: withdrawal.receiver,
    type: AssetType.ETH,
    value: BigNumber.from(withdrawal.ethValue),
    outgoingMessageState,
    l2TxHash: l2TxReceipt.transactionHash,
    symbol: 'ETH',
    decimals: 18
  } as L2ToL1EventResultPlus
}
