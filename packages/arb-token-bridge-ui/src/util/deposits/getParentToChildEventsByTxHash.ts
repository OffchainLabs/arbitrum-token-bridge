import { providers, utils } from 'ethers'
import { L1ERC20Gateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L1ERC20Gateway__factory'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  ArbitrumNetwork,
  EthDepositMessage,
  getArbitrumNetwork,
  ParentToChildMessageReader,
  ParentToChildMessageReaderClassic,
  ParentTransactionReceipt
} from '@arbitrum/sdk'
import { parseTypedLogs } from '@arbitrum/sdk/dist/lib/dataEntities/event'

import {
  getChainIdFromProvider,
  getProviderForChainId
} from '@/token-bridge-sdk/utils'
import { updateAdditionalDepositData } from './helpers'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { Transaction } from '../../types/Transactions'
import { fetchNativeCurrency } from '../../hooks/useNativeCurrency'

export interface ParentToChildMessagesAndDepositMessages {
  tokenDepositRetryables: ParentToChildMessageReader[]
  tokenDepositRetryablesClassic: ParentToChildMessageReaderClassic[]
  ethDeposits: EthDepositMessage[]
}

async function getParentTxReceipt(
  txHash: string,
  parentChainId: number
): Promise<ParentTransactionReceipt | undefined> {
  try {
    const parentProvider = getProviderForChainId(Number(parentChainId))

    const receipt = await parentProvider.getTransactionReceipt(txHash)
    if (receipt) {
      return new ParentTransactionReceipt(receipt)
    }
  } catch (e) {
    console.warn(`Cannot get tx receipt from parent chain ${parentChainId}`)
  }
}

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

const getDepositInitiatedLogs = (logs: providers.Log[]) => {
  return parseTypedLogs(L1ERC20Gateway__factory, logs, 'DepositInitiated')
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

  const isClassic = await parentTxReceipt.isClassic(childProvider)

  const parentToChildMessagesClassic = isClassic
    ? await parentTxReceipt.getParentToChildMessagesClassic(childProvider)
    : ([] as ParentToChildMessageReaderClassic[])

  const parentToChildMessages = isClassic
    ? ([] as ParentToChildMessageReader[])
    : await parentTxReceipt.getParentToChildMessages(childProvider)

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
 * @param childChainId
 * @param txHash The uniqueId indexed field was removed in nitro and a hash indexed field was added.
 * For pre-nitro events the value passed in here will be used to find events with the same uniqueId.
 * For post nitro events it will be used to find events with the same hash.
 * @returns Any classic and nitro events that match the provided filters.
 */
export async function getParentToChildEventsByTxHash({
  childChainId,
  txHash
}: {
  childChainId: number
  txHash: string
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
  const childChain = getArbitrumNetwork(childChainId)
  const parentChainId = childChain.parentChainId
  const parentProvider = getProviderForChainId(parentChainId)

  const parentTxReceipt = await getParentTxReceipt(txHash, parentChainId)

  if (!parentTxReceipt) {
    return {
      ethDeposits: [],
      tokenDepositRetryables: []
    }
  }

  const messages = await getChildChainMessages(childChain, parentTxReceipt)

  if (typeof messages === 'undefined') {
    return { ethDeposits: [], tokenDepositRetryables: [] }
  }

  const tokenDepositRetryables: Transaction[] = await Promise.all(
    messages.tokenDepositRetryables
      .map(async tokenDepositMessage => {
        const childChainId = await getChainIdFromProvider(
          tokenDepositMessage.childProvider
        )

        const depositsInitiatedLogs = getDepositInitiatedLogs(
          parentTxReceipt.logs
        )

        if (typeof depositsInitiatedLogs === 'undefined') {
          return
        }

        const firstDepositInitiatedLog = depositsInitiatedLogs[0]
        if (typeof firstDepositInitiatedLog === 'undefined') {
          return
        }

        const parentChainErc20Address = firstDepositInitiatedLog.l1Token
        const tokenAmount = firstDepositInitiatedLog._amount.toString()

        let tokenDepositData:
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

        const parentChainProvider = getProviderForChainId(parentChainId)

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

        const receiverFromLog = firstDepositInitiatedLog._to

        const timestamp = (
          await parentProvider.getBlock(parentTxReceipt.blockNumber)
        ).timestamp

        const depositTx: Transaction = {
          destination: receiverFromLog,
          sender: parentTxReceipt.from,
          timestampCreated: timestamp.toString(),
          type: 'deposit',
          isClassic: false,
          txID: parentTxReceipt.transactionHash,
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
          assetName: tokenDepositData?.l1Token.symbol ?? '',
          tokenAddress: parentChainErc20Address,
          parentChainId,
          childChainId,
          l1NetworkID: parentChainId.toString(),
          l2NetworkID: childChainId.toString()
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
    messages.ethDeposits.map(async depositMessage => {
      const timestamp = (
        await parentProvider.getBlock(parentTxReceipt.blockNumber)
      ).timestamp
      const childProvider = getProviderForChainId(depositMessage.childChainId)
      const nativeCurrency = await fetchNativeCurrency({
        provider: childProvider
      })
      const depositTx: Transaction = {
        destination: depositMessage.to.toLowerCase(),
        sender: parentTxReceipt.from.toLowerCase(),
        timestampCreated: timestamp.toString(),
        txID: parentTxReceipt.transactionHash,
        type: 'deposit-l1',
        isClassic: false,
        value: utils.formatUnits(
          depositMessage.value.toString(),
          nativeCurrency.decimals
        ),
        blockNumber: parentTxReceipt.blockNumber,
        direction: 'deposit',
        source: 'event_logs',
        parentChainId,
        childChainId: depositMessage.childChainId,
        l1NetworkID: parentChainId.toString(),
        l2NetworkID: depositMessage.childChainId.toString(),
        assetType: AssetType.ETH,
        assetName: nativeCurrency.symbol
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
