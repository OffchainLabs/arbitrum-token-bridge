import { BigNumber, providers, utils } from 'ethers'
import { BlockTag, Provider } from '@ethersproject/providers'
import {
  DepositInitiatedEvent,
  L1ERC20Gateway
} from '@arbitrum/sdk/dist/lib/abi/L1ERC20Gateway'
import { L1ERC20Gateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L1ERC20Gateway__factory'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  ArbitrumNetwork,
  ChildTransactionReceipt,
  EventFetcher,
  getArbitrumNetwork,
  getArbitrumNetworks,
  ParentTransactionReceipt
} from '@arbitrum/sdk'

import { getParentTxReceipt } from '../helpers'
import {
  getChainIdFromProvider,
  getProviderForChainId
} from '@/token-bridge-sdk/utils'
import { normalizeTimestamp } from '../../../state/app/utils'
import { ParentToChildMessagesAndDepositMessages } from './helpers'
import { Transaction } from '../../../types/Transactions'
import { updateAdditionalDepositData } from '../../../util/deposits/helpers'
import { AssetType } from '../../../hooks/arbTokenBridge.types'
import { fetchNativeCurrency } from '../../../hooks/useNativeCurrency'

export type FetchDepositTxFromEventLogResult = {
  receiver: string
  sender: string
  timestampCreated: string
  transactionHash: string
  type: 'EthDeposit' | 'TokenDeposit'
  isClassic: boolean
  id: string
  ethValue?: string
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

const getDepositInitiatedLogs = async ({
  fromBlock,
  toBlock,
  parentChainProvider,
  childChain
}: {
  fromBlock: number
  toBlock: number
  parentChainProvider: Provider
  childChain: ArbitrumNetwork
}) => {
  const [
    depositsInitiatedLogsL1Erc20Gateway,
    depositsInitiatedLogsL1CustomGateway,
    depositsInitiatedLogsL1WethGateway
  ] = await Promise.all(
    [
      childChain.tokenBridge!.parentErc20Gateway,
      childChain.tokenBridge!.parentCustomGateway,
      childChain.tokenBridge!.parentWethGateway
    ].map(gatewayAddress => {
      return getDepositInitiatedEventData(
        gatewayAddress,
        { fromBlock, toBlock },
        parentChainProvider
      )
    })
  )

  return [
    ...(depositsInitiatedLogsL1Erc20Gateway || []),
    ...(depositsInitiatedLogsL1CustomGateway || []),
    ...(depositsInitiatedLogsL1WethGateway || [])
  ]
}

const getDepositInitiatedEventData = async (
  parentChainGatewayAddress: string,
  filter: {
    fromBlock: providers.BlockTag
    toBlock: providers.BlockTag
  },
  parentChainProvider: providers.Provider
) => {
  const eventFetcher = new EventFetcher(parentChainProvider)
  const logs = await eventFetcher.getEvents<
    L1ERC20Gateway,
    DepositInitiatedEvent
  >(L1ERC20Gateway__factory, (g: any) => g.filters.DepositInitiated(), {
    ...filter,
    address: parentChainGatewayAddress
  })

  return logs
}

async function getChildChainMessages(
  childChain: ArbitrumNetwork,
  parentTxReceipt: ParentTransactionReceipt
) {
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

  const parentToChildMessagesClassic =
    await parentTxReceipt.getParentToChildMessagesClassic(childProvider)

  const parentToChildMessages = await parentTxReceipt.getParentToChildMessages(
    childProvider
  )

  const ethDeposits = await parentTxReceipt.getEthDeposits(childProvider)

  return {
    tokenDepositRetryables: parentToChildMessages,
    tokenDepositRetryablesClassic: parentToChildMessagesClassic,
    ethDeposits
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
export async function getParentToChildEventsByTxHash({
  parentChainId,
  filter,
  position,
  destination,
  txHash,
  indexInBatch
}: {
  parentChainId: number
  filter?: { fromBlock: BlockTag; toBlock: BlockTag }
  position?: BigNumber
  destination?: string
  txHash?: string
  indexInBatch?: BigNumber
}): Promise<{
  ethDeposits: Transaction[]
  tokenDepositRetryables: Transaction[]
}> {
  if (!txHash) {
    return {
      ethDeposits: [],
      tokenDepositRetryables: []
    }
  }
  const parentTxReceipt = await getParentTxReceipt(txHash, parentChainId)

  const parentProvider = getProviderForChainId(parentChainId)

  if (!parentTxReceipt) {
    return {
      ethDeposits: [],
      tokenDepositRetryables: []
    }
  }

  const childChainMessages = getArbitrumNetworks()
    .filter(childChain => childChain.parentChainId === parentChainId)
    .map(childChain => getChildChainMessages(childChain, parentTxReceipt))

  const messages = await Promise.all(childChainMessages)

  if (typeof messages === 'undefined') {
    return { ethDeposits: [], tokenDepositRetryables: [] }
  }

  const allMessages: ParentToChildMessagesAndDepositMessages = messages
    .filter(message => typeof message !== 'undefined')
    .reduce(
      (acc, value) => {
        if (typeof acc === 'undefined') {
          return {
            tokenDepositRetryables: [],
            tokenDepositRetryablesClassic: [],
            ethDeposits: []
          }
        }
        if (typeof value === 'undefined') {
          return acc
        }
        return {
          tokenDepositRetryables: acc.tokenDepositRetryables.concat(
            value.tokenDepositRetryables
          ),
          tokenDepositRetryablesClassic:
            acc.tokenDepositRetryablesClassic.concat(
              value.tokenDepositRetryablesClassic
            ),
          ethDeposits: acc.ethDeposits.concat(value.ethDeposits)
        }
      },
      {
        tokenDepositRetryables: [],
        tokenDepositRetryablesClassic: [],
        ethDeposits: []
      } as ParentToChildMessagesAndDepositMessages
    )

  const tokenDepositRetryables: Transaction[] = await Promise.all(
    allMessages.tokenDepositRetryables
      .map(async tokenDepositMessage => {
        const retryableReceipt =
          await tokenDepositMessage.getRetryableCreationReceipt()
        if (!retryableReceipt) {
          return Promise.resolve([])
        }
        const childChainId = await getChainIdFromProvider(
          tokenDepositMessage.childProvider
        )
        const childChain = getArbitrumNetwork(childChainId)

        const childChainTxReceipt = new ChildTransactionReceipt(
          retryableReceipt
        )
        const [event] = childChainTxReceipt.getChildToParentEvents()

        const receiver = await tokenDepositMessage.getBeneficiary()

        let parentChainErc20Address: string | undefined,
          tokenAmount: string | undefined,
          tokenDepositData:
            | {
                tokenAmount: string | undefined
                l1Token: {
                  symbol: string
                  decimals: number
                  id: string
                  name: string
                }
              }
            | undefined

        try {
          if (!event) {
            return Promise.resolve([])
          }
          const retryableMessageData = event.data
          const retryableBody = retryableMessageData.split('0xc9f95d32')[1]
          const requestId = '0x' + retryableBody?.slice(0, 64)
          const depositsInitiatedLogs = parentTxReceipt.logs.filter(
            log =>
              log.address.toLowerCase() ===
              childChain.ethBridge.inbox.toLowerCase()
          )
          const depositsInitiatedEvent = depositsInitiatedLogs.find(
            log => log.topics[3] === requestId
          )
          // @ts-ignore
          parentChainErc20Address = depositsInitiatedEvent?.event[0]
          // @ts-ignore
          tokenAmount = depositsInitiatedEvent?.event[4]?.toString()
        } catch (e) {
          console.log(e)
        }

        const parentChainProvider = getProviderForChainId(parentChainId)

        if (parentChainErc20Address) {
          try {
            const erc20 = ERC20__factory.connect(
              parentChainErc20Address,
              parentChainProvider
            )
            const [name, symbol, decimals] = await Promise.all([
              erc20.name(),
              erc20.symbol(),
              erc20.decimals()
            ])
            tokenDepositData = {
              tokenAmount,
              l1Token: {
                symbol,
                decimals,
                id: parentChainErc20Address,
                name
              }
            }
          } catch (e) {
            console.log('failed to fetch token data', e)
          }
        }

        const depositTx: Transaction = {
          destination: receiver,
          sender: tokenDepositMessage.sender,
          timestampCreated: event?.timestamp.toString(),
          type: 'deposit',
          isClassic: false,
          txID: retryableReceipt.transactionHash,
          value:
            typeof tokenDepositData !== 'undefined' &&
            typeof tokenDepositData.tokenAmount !== 'undefined'
              ? utils.formatUnits(
                  tokenDepositData.tokenAmount,
                  tokenDepositData.l1Token.decimals
                )
              : null,
          blockNumber: parentTxReceipt.blockNumber,
          direction: 'deposit',
          source: 'event_logs',
          assetType: AssetType.ERC20,
          assetName: tokenDepositData?.l1Token.name ?? '',
          parentChainId,
          l1NetworkID: parentChainId.toString(),
          childChainId
        }

        const childProvider = getProviderForChainId(childChainId)

        return await updateAdditionalDepositData({
          depositTx,
          parentProvider,
          childProvider
        })
      })
      .filter(
        (eventLogResult): eventLogResult is Promise<Transaction> =>
          typeof eventLogResult !== 'undefined'
      )
  )

  const ethDeposits: Transaction[] = await Promise.all(
    allMessages.ethDeposits.map(async depositMessage => {
      const timestamp = normalizeTimestamp(
        (await parentProvider.getBlock(parentTxReceipt.blockNumber)).timestamp
      )
      const childProvider = getProviderForChainId(depositMessage.childChainId)
      const nativeCurrency = await fetchNativeCurrency({
        provider: childProvider
      })
      const depositTx: Transaction = {
        destination: depositMessage.to,
        sender: depositMessage.from,
        timestampCreated: timestamp.toString(),
        txID: depositMessage.childTxHash,
        type: 'deposit',
        isClassic: false,
        value: utils.formatUnits(
          depositMessage.value.toString(),
          nativeCurrency.decimals
        ),
        blockNumber: parentTxReceipt.blockNumber,
        direction: 'deposit',
        source: 'event_logs',
        parentChainId,
        l1NetworkID: parentChainId.toString(),
        childChainId: depositMessage.childChainId,
        assetType: AssetType.ETH,
        assetName: nativeCurrency.name
      }
      return await updateAdditionalDepositData({
        depositTx,
        parentProvider,
        childProvider
      })
    })
  )

  return { ethDeposits, tokenDepositRetryables }
}
