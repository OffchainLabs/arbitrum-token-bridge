import { useCallback, useEffect } from 'react'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import {
  EthDepositMessage,
  L1ToL2MessageReader,
  L1ToL2MessageReaderClassic
} from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { useActions, useAppState } from '../../state'
import { useInterval } from '../common/Hooks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getL1ToL2MessageDataFromL1TxHash } from '../../util/deposits/helpers'
import { useTransactions } from '../../hooks/useTransactions'

export function RetryableTxnsIncluder(): JSX.Element {
  const actions = useActions()
  const {
    l1: { provider: l1Provider },
    l2: { provider: l2Provider }
  } = useNetworksAndSigners()

  const {
    app: { arbTokenBridgeLoaded }
  } = useAppState()

  const {
    l1DepositsWithUntrackedL2Messages,
    failedRetryablesToRedeem,
    addTransactions,
    fetchAndUpdateL1ToL2MsgClassicStatus,
    fetchAndUpdateEthDepositMessageStatus,
    fetchAndUpdateL1ToL2MsgStatus
  } = useTransactions()

  const fetchAndUpdateDepositStatus = useCallback(
    async (depositTxId: string, depositAssetType: AssetType | string) => {
      const isEthDeposit = depositAssetType === AssetType.ETH

      const { l1ToL2Msg, isClassic } = await getL1ToL2MessageDataFromL1TxHash({
        depositTxId,
        isEthDeposit,
        l1Provider,
        l2Provider
      })

      if (!l1ToL2Msg) return

      const status = await l1ToL2Msg?.status()

      // Classic messages
      if (isClassic) {
        fetchAndUpdateL1ToL2MsgClassicStatus(
          depositTxId,
          l1ToL2Msg as L1ToL2MessageReaderClassic,
          isEthDeposit,
          status as L1ToL2MessageStatus
        )
        return
      }

      // Non-classic - Eth deposit
      if (isEthDeposit) {
        fetchAndUpdateEthDepositMessageStatus(
          depositTxId,
          l1ToL2Msg as EthDepositMessage
        )
      } else {
        // Non-classic - Token deposit
        fetchAndUpdateL1ToL2MsgStatus(
          depositTxId,
          l1ToL2Msg as L1ToL2MessageReader,
          false,
          status as L1ToL2MessageStatus
        )
      }
    },
    [l1Provider, l2Provider]
  )

  const checkAndUpdateFailedRetryables = useCallback(async () => {
    for (const depositTx of failedRetryablesToRedeem) {
      const depositTxId = depositTx.txId
      const depositAssetType = depositTx.asset

      fetchAndUpdateDepositStatus(depositTxId, depositAssetType)
    }
  }, [addTransactions, fetchAndUpdateDepositStatus, failedRetryablesToRedeem])

  /**
   * For every L1 deposit, we ensure the relevant L1ToL2MessageIsIncluded
   */
  const checkAndAddMissingL1ToL2Messages = useCallback(async () => {
    for (const depositTx of l1DepositsWithUntrackedL2Messages) {
      const depositTxId = depositTx.txID
      const depositAssetType = depositTx.assetType

      fetchAndUpdateDepositStatus(depositTxId, depositAssetType)
    }
  }, [
    addTransactions,
    fetchAndUpdateDepositStatus,
    l1DepositsWithUntrackedL2Messages
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
