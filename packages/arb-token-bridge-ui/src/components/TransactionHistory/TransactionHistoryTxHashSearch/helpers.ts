import { BigNumber } from 'ethers'
import {
  ArbitrumNetwork,
  ChildToParentMessage,
  ChildToParentMessageReader,
  ChildToParentMessageStatus,
  ChildTransactionReceipt,
  getArbitrumNetwork,
  getArbitrumNetworks
} from '@arbitrum/sdk'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { supportedParentChains } from '../helpers'
import { JsonRpcProvider } from '@ethersproject/providers'

export enum ChildTxStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  NOT_FOUND = 'NOT_FOUND'
}

export enum ReceiptState {
  EMPTY,
  LOADING,
  INVALID_INPUT_LENGTH,
  NOT_FOUND,
  L1_FAILED,
  L2_FAILED,
  NO_L1_L2_MESSAGES,
  MESSAGES_FOUND,
  NO_L2_L1_MESSAGES
}

export interface ChildToParentMessageData {
  status: ChildToParentMessageStatus
  childToParentMessage: ChildToParentMessage
  confirmationInfo: {
    deadlineBlock: BigNumber
    etaSeconds: number
  } | null
  childNetwork: ArbitrumNetwork
  childProvider: JsonRpcProvider
  createdAtChildBlockNumber: number
  childToParentEventIndex: number
}

export interface ChildToParentMessageSearchResult {
  childTxStatus: ChildTxStatus
  childToParentMessages: ChildToParentMessageData[]
  childTxHash: string
}

export const getChildToParentMessages = async (
  txHash: string
): Promise<ChildToParentMessageSearchResult> => {
  return new Promise(async resolve => {
    const supportedChildChainIds = getArbitrumNetworks()
    const messagesPromises = supportedChildChainIds.map(async ({ chainId }) => {
      const childNetwork = await getArbitrumNetwork(Number(chainId))
      const childProvider = getProviderForChainId(Number(chainId))

      const parentChainId =
        childNetwork.parentChainId as unknown as keyof typeof supportedParentChains
      const parentProvider = getProviderForChainId(Number(parentChainId))
      try {
        await parentProvider.getBlockNumber()
      } catch (e) {
        console.warn(supportedParentChains[parentChainId], 'not working')
        return null
      }
      const [l1BlogNumber, receipt] = await Promise.all([
        parentProvider.getBlockNumber(),
        childProvider.getTransactionReceipt(txHash)
      ])
      const currentL1Block = BigNumber.from(l1BlogNumber)
      if (!receipt) {
        return null
      }
      if (receipt.status === 0) {
        // l1 tx failed, terminal
        resolve({
          childTxStatus: ChildTxStatus.FAILURE,
          childToParentMessages: [],
          childTxHash: txHash
        })
      }

      const l2Receipt = new ChildTransactionReceipt(receipt)
      const l2ToL1Events = l2Receipt.getChildToParentEvents()
      const l2MessagesData: Promise<ChildToParentMessageData>[] =
        l2ToL1Events.map(
          async (childToParentEvent, childToParentEventIndex) => {
            const childToParentMessage = new ChildToParentMessageReader(
              parentProvider,
              childToParentEvent
            )
            try {
              const status = await childToParentMessage.status(childProvider)
              const deadlineBlock =
                status !== ChildToParentMessageStatus.CONFIRMED &&
                status !== ChildToParentMessageStatus.EXECUTED
                  ? await childToParentMessage.getFirstExecutableBlock(
                      childProvider
                    )
                  : null
              return {
                status,
                childToParentMessage,
                confirmationInfo: deadlineBlock
                  ? {
                      deadlineBlock,
                      etaSeconds: deadlineBlock
                        .sub(currentL1Block)
                        .mul(12)
                        .toNumber()
                    }
                  : null,
                childNetwork,
                childProvider,
                createdAtChildBlockNumber: l2Receipt.blockNumber,
                childToParentEventIndex
              }
            } catch (e) {
              const expectedError = "batch doesn't exist"
              const err = e as Error & { error: Error }
              const actualError =
                err && (err.message || (err.error && err.error.message))
              if (actualError.includes(expectedError)) {
                console.warn('batch doesnt exist')

                return {
                  status: ChildToParentMessageStatus.UNCONFIRMED,
                  childToParentMessage,
                  confirmationInfo: null,
                  childNetwork,
                  childProvider,
                  createdAtChildBlockNumber: l2Receipt.blockNumber,
                  childToParentEventIndex
                }
              } else {
                throw e
              }
            }
          }
        )

      return await Promise.all(l2MessagesData)
    })

    const data = await Promise.all(messagesPromises)
    const messages = data
      .flatMap(d => d)
      .filter(d => d) as ChildToParentMessageData[]

    if (messages.length) {
      resolve({
        childTxStatus: ChildTxStatus.SUCCESS,
        childToParentMessages: messages,
        childTxHash: txHash
      })
    } else {
      resolve({
        childTxStatus: ChildTxStatus.NOT_FOUND,
        childToParentMessages: [],
        childTxHash: txHash
      })
    }
  })
}
