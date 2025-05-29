import {
  ChildToParentMessageReader,
  ChildTransactionReceipt,
  scaleFrom18DecimalsToNativeTokenDecimals
} from '@arbitrum/sdk'
import { BigNumber } from '@ethersproject/bignumber'
import { Provider } from '@ethersproject/providers'
import dayjs from 'dayjs'
import { utils } from 'ethers'

import {
  AssetType,
  L2ToL1EventResult,
  L2ToL1EventResultPlus,
  OutgoingMessageState,
  WithdrawalInitiated
} from '../../hooks/arbTokenBridge.types'
import { getExecutedMessagesCacheKey } from '../../hooks/useArbTokenBridge'
import { fetchNativeCurrency } from '../../hooks/useNativeCurrency'
import { getWithdrawalConfirmationDate } from '../../hooks/useTransferDuration'
import { addToLocalStorageObjectSequentially } from '../CommonUtils'
import { fetchErc20Data } from '../TokenUtils'
import { WithdrawalFromSubgraph } from './fetchWithdrawalsFromSubgraph'

/**
 * `l2TxHash` exists on result from subgraph
 * `transactionHash` exists on result from event logs
 */
export type EthWithdrawal = L2ToL1EventResult & {
  l2TxHash?: string
  transactionHash?: string
  direction: 'withdrawal'
  source: 'subgraph' | 'event_logs' | 'local_storage_cache'
  parentChainId: number
  childChainId: number
}

export async function attachTimestampToTokenWithdrawal({
  withdrawal,
  l2Provider
}: {
  withdrawal: WithdrawalInitiated
  l2Provider: Provider
}) {
  const txReceipt = await l2Provider.getTransactionReceipt(withdrawal.txHash)
  const l2TxReceipt = new ChildTransactionReceipt(txReceipt)
  const [event] = l2TxReceipt.getChildToParentEvents()

  return {
    ...withdrawal,
    timestamp: event?.timestamp
  }
}

export async function mapETHWithdrawalToL2ToL1EventResult({
  event,
  l1Provider,
  l2Provider
}: {
  event: EthWithdrawal
  l1Provider: Provider
  l2Provider: Provider
}): Promise<L2ToL1EventResultPlus> {
  const { callvalue } = event
  const outgoingMessageState = await getOutgoingMessageState(
    event,
    l1Provider,
    l2Provider,
    event.childChainId
  )

  const nativeCurrency = await fetchNativeCurrency({ provider: l2Provider })

  return {
    ...event,
    sender: event.caller,
    destinationAddress: event.destination,
    type: AssetType.ETH,
    value: scaleFrom18DecimalsToNativeTokenDecimals({
      amount: callvalue,
      decimals: nativeCurrency.decimals
    }),
    symbol: nativeCurrency.symbol,
    outgoingMessageState,
    l2TxHash: event.l2TxHash || event.transactionHash,
    parentChainId: event.parentChainId,
    childChainId: event.childChainId,
    decimals: nativeCurrency.decimals
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
  const localStorageKey = 'arbitrum:bridge:executed-messages'

  const executedMessagesCache = JSON.parse(
    localStorage.getItem(localStorageKey) || '{}'
  )
  if (executedMessagesCache[cacheKey]) {
    return OutgoingMessageState.EXECUTED
  }

  const confirmationDate = getWithdrawalConfirmationDate({
    createdAt: event.timestamp.toNumber() * 1000,
    withdrawalFromChainId: l2ChainID
  })

  if (dayjs() < confirmationDate) {
    return OutgoingMessageState.UNCONFIRMED
  }

  const messageReader = new ChildToParentMessageReader(l1Provider, event)

  try {
    const status = await messageReader.status(l2Provider)

    if (status === OutgoingMessageState.EXECUTED) {
      addToLocalStorageObjectSequentially({
        localStorageKey,
        localStorageValue: { [cacheKey]: true }
      })
    }

    return status
  } catch (error) {
    return OutgoingMessageState.UNCONFIRMED
  }
}

export function isTokenWithdrawal(
  withdrawal: WithdrawalInitiated | EthWithdrawal
): withdrawal is WithdrawalInitiated {
  return typeof (withdrawal as WithdrawalInitiated).l1Token !== 'undefined'
}

export async function mapTokenWithdrawalFromEventLogsToL2ToL1EventResult({
  result,
  l1Provider,
  l2Provider
}: {
  result: WithdrawalInitiated
  l1Provider: Provider
  l2Provider: Provider
}): Promise<L2ToL1EventResultPlus | undefined> {
  const { symbol, decimals } = await fetchErc20Data({
    address: result.l1Token,
    provider: l1Provider
  })

  const txReceipt = await l2Provider.getTransactionReceipt(result.txHash)
  const l2TxReceipt = new ChildTransactionReceipt(txReceipt)

  // TODO: length != 1
  const [event] = l2TxReceipt.getChildToParentEvents()

  if (!event) {
    return undefined
  }

  const outgoingMessageState = await getOutgoingMessageState(
    event,
    l1Provider,
    l2Provider,
    result.childChainId
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
    parentChainId: result.parentChainId,
    childChainId: result.childChainId
  }
}

export async function mapWithdrawalFromSubgraphToL2ToL1EventResult({
  withdrawal,
  l1Provider,
  l2Provider
}: {
  withdrawal: WithdrawalFromSubgraph
  l1Provider: Provider
  l2Provider: Provider
}): Promise<L2ToL1EventResultPlus | undefined> {
  // get transaction receipt
  const txReceipt = await l2Provider.getTransactionReceipt(withdrawal.l2TxHash)
  const l2TxReceipt = new ChildTransactionReceipt(txReceipt)

  // TODO: length != 1
  const [event] = l2TxReceipt.getChildToParentEvents()

  if (!event) {
    return undefined
  }

  const outgoingMessageState = await getOutgoingMessageState(
    event,
    l1Provider,
    l2Provider,
    withdrawal.childChainId
  )

  if (withdrawal.type === 'TokenWithdrawal' && withdrawal?.l1Token?.id) {
    // Token withdrawal
    const { symbol, decimals } = await fetchErc20Data({
      address: withdrawal.l1Token.id,
      provider: l1Provider
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
      parentChainId: withdrawal.parentChainId,
      childChainId: withdrawal.childChainId
    } as L2ToL1EventResultPlus
  }

  const nativeCurrency = await fetchNativeCurrency({ provider: l2Provider })

  // Else, Eth withdrawal
  return {
    ...event,
    sender: withdrawal.sender,
    destinationAddress: withdrawal.receiver,
    type: AssetType.ETH,
    value: scaleFrom18DecimalsToNativeTokenDecimals({
      amount: BigNumber.from(withdrawal.ethValue),
      decimals: nativeCurrency.decimals
    }),
    outgoingMessageState,
    l2TxHash: l2TxReceipt.transactionHash,
    symbol: nativeCurrency.symbol,
    decimals: nativeCurrency.decimals,
    parentChainId: withdrawal.parentChainId,
    childChainId: withdrawal.childChainId
  } as L2ToL1EventResultPlus
}
