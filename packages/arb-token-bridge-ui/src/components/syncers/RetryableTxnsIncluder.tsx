import { useCallback, useEffect } from 'react'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import {
  EthDepositMessage,
  L1ToL2MessageReader,
  L1ToL2MessageReaderClassic
} from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'
import { AssetType, getRetyableMessageDataFromTxID } from 'token-bridge-sdk'
import { useActions, useAppState } from '../../state'
import { useInterval } from '../common/Hooks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

export function RetryableTxnsIncluder(): JSX.Element {
  const actions = useActions()
  const {
    l1: { provider: l1Provider },
    l2: { provider: l2Provider }
  } = useNetworksAndSigners()

  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()

  const fetchAndUpdateDepositStatus = useCallback(
    async (depositTxId, depositAssetType) => {
      const isEthDeposit = depositAssetType === AssetType.ETH

      const { l1ToL2Msg, isClassic } = await getRetyableMessageDataFromTxID({
        depositTxId,
        isEthDeposit,
        l1Provider,
        l2Provider
      })

      if (!l1ToL2Msg) return

      const status = await l1ToL2Msg?.status()

      // Classic messages
      if (isClassic) {
        arbTokenBridge?.transactions?.fetchAndUpdateL1ToL2MsgClassicStatus(
          depositTxId,
          l1ToL2Msg as L1ToL2MessageReaderClassic,
          isEthDeposit,
          status as L1ToL2MessageStatus
        )
        return
      }

      // Non-classic - Eth deposit
      if (isEthDeposit) {
        arbTokenBridge?.transactions?.fetchAndUpdateEthDepositMessageStatus(
          depositTxId,
          l1ToL2Msg as EthDepositMessage
        )
      } else {
        // Non-classic - Token deposit
        arbTokenBridge.transactions?.fetchAndUpdateL1ToL2MsgStatus(
          depositTxId,
          l1ToL2Msg as L1ToL2MessageReader,
          false,
          status as L1ToL2MessageStatus
        )
      }
    },
    [l1Provider, l2Provider, arbTokenBridge?.transactions]
  )

  const checkAndUpdateFailedRetryables = useCallback(async () => {
    const failedRetryablesToRedeem = actions.app.getFailedRetryablesToRedeem()
    for (const depositTx of failedRetryablesToRedeem) {
      const depositTxId = depositTx.txId
      const depositAssetType = depositTx.asset

      fetchAndUpdateDepositStatus(depositTxId, depositAssetType)
    }
  }, [
    arbTokenBridge?.transactions?.addTransactions,
    fetchAndUpdateDepositStatus
  ])

  /**
   * For every L1 deposit, we ensure the relevant L1ToL2MessageIsIncluded
   */
  const checkAndAddMissingL1ToL2Messages = useCallback(async () => {
    const l1DepositsWithUntrackedL2Messages =
      actions.app.l1DepositsWithUntrackedL2Messages()

    for (const depositTx of l1DepositsWithUntrackedL2Messages) {
      const depositTxId = depositTx.txID
      const depositAssetType = depositTx.assetType

      fetchAndUpdateDepositStatus(depositTxId, depositAssetType)
    }
  }, [
    arbTokenBridge?.transactions?.addTransactions,
    fetchAndUpdateDepositStatus
  ])

  const { forceTrigger: forceTriggerUpdate } = useInterval(
    checkAndAddMissingL1ToL2Messages,
    5000
  )

  const { forceTrigger: forceTriggerUpdateFailedRetryables } = useInterval(
    checkAndUpdateFailedRetryables,
    10000
  )

  useEffect(() => {
    // force trigger update each time loaded change happens
    forceTriggerUpdate()
    forceTriggerUpdateFailedRetryables()
  }, [arbTokenBridgeLoaded])

  return <></>
}
