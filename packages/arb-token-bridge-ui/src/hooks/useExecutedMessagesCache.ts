import { useCallback } from 'react'
import { useLocalStorage } from '@rehooks/local-storage'
import { EventArgs, ChildToParentTransactionEvent } from '@arbitrum/sdk'
import { L2ToL1TransactionEvent as ClassicL2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/abi/ArbSys'

import { L2ToL1EventResult } from './arbTokenBridge.types'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useNetworks } from './useNetworks'

export type ExecutedMessagesCache = {
  [id: string]: boolean
}

export type ExecutedMessagesCacheKeyParams = {
  event: L2ToL1EventResult
  childChainId: number
}

function isClassicL2ToL1TransactionEvent(
  event: ChildToParentTransactionEvent
): event is EventArgs<ClassicL2ToL1TransactionEvent> {
  return typeof (event as any).batchNumber !== 'undefined'
}

function getExecutedMessagesCacheKey({
  event,
  childChainId
}: ExecutedMessagesCacheKeyParams) {
  return isClassicL2ToL1TransactionEvent(event)
    ? `childChainId: ${childChainId}, batchNumber: ${event.batchNumber.toString()}, indexInBatch: ${event.indexInBatch.toString()}`
    : `childChainId: ${childChainId}, position: ${event.position.toString()}`
}

export function checkExecutedMessagesCache(
  params: ExecutedMessagesCacheKeyParams
): boolean {
  const cache = JSON.parse(
    localStorage.getItem('arbitrum:bridge:executed-messages') || '{}'
  )

  return typeof cache[getExecutedMessagesCacheKey(params)] !== 'undefined'
}

export function useExecutedMessagesCache() {
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)

  const [executedMessagesCache, setExecutedMessagesCache] =
    useLocalStorage<ExecutedMessagesCache>(
      'arbitrum:bridge:executed-messages',
      {}
    ) as [
      ExecutedMessagesCache,
      React.Dispatch<ExecutedMessagesCache>,
      React.Dispatch<void>
    ]

  const add = useCallback(
    (events: L2ToL1EventResult[]) => {
      const added: { [cacheKey: string]: boolean } = {}

      events.forEach((event: L2ToL1EventResult) => {
        const cacheKey = getExecutedMessagesCacheKey({
          event,
          childChainId: childChain.id
        })

        added[cacheKey] = true
      })

      setExecutedMessagesCache({ ...executedMessagesCache, ...added })
    },
    [executedMessagesCache, setExecutedMessagesCache, childChain.id]
  )

  return [executedMessagesCache, add] as const
}
