import { useCallback, useEffect } from 'react'
import { L1TransactionReceipt, L1ToL2MessageStatus } from '@arbitrum/sdk'

import { useActions, useAppState } from '../../state'

import { useInterval } from '../common/Hooks'
import { useSigners } from '../../hooks/useSigners'

export function RetryableTxnsIncluder(): JSX.Element {
  const actions = useActions()
  const { l1Signer, l2Signer } = useSigners()
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()

  const checkAndUpdateFailedRetryables = useCallback(async () => {
    // This should never be the case
    if (typeof l1Signer === 'undefined' || typeof l2Signer === 'undefined') {
      return
    }

    const failedRetryablesToRedeem = actions.app.getFailedRetryablesToRedeem()

    for (let depositTx of failedRetryablesToRedeem) {
      const depositTxRec = new L1TransactionReceipt(
        await l1Signer.provider.getTransactionReceipt(depositTx.txId)
      ) //**TODO: not found, i.e., reorg */
      const l1ToL2Msg = await depositTxRec.getL1ToL2Message(l2Signer)
      const status = await l1ToL2Msg.status()
      if (status !== L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
        arbTokenBridge?.transactions?.updateL1ToL2MsgData(
          depositTx.txId,
          l1ToL2Msg,
          status
        )
      }
    }
  }, [arbTokenBridge?.transactions?.addTransactions, l1Signer, l2Signer])

  /**
   * For every L1 deposit, we ensure the relevant L1ToL2MessageIsIncluded
   */
  const checkAndAddMissingL1ToL2Messagges = useCallback(async () => {
    // This should never be the case
    if (typeof l1Signer === 'undefined' || typeof l2Signer === 'undefined') {
      return
    }

    const l1DepositsWithUntrackedL2Messages =
      actions.app.l1DepositsWithUntrackedL2Messages()

    for (let depositTx of l1DepositsWithUntrackedL2Messages) {
      const depositTxRec = new L1TransactionReceipt(
        await l1Signer.provider.getTransactionReceipt(depositTx.txID)
      ) //**TODO: not found, i.e., reorg */
      const l1ToL2Msg = await depositTxRec.getL1ToL2Message(l2Signer)

      arbTokenBridge?.transactions?.updateL1ToL2MsgData(
        depositTx.txID,
        l1ToL2Msg
      )
    }
  }, [arbTokenBridge?.transactions?.addTransactions, l1Signer, l2Signer])

  const { forceTrigger: forceTriggerUpdate } = useInterval(
    checkAndAddMissingL1ToL2Messagges,
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
