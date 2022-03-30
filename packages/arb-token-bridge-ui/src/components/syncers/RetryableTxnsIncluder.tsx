import { useCallback, useEffect, useContext } from 'react'
import { useActions, useAppState } from '../../state'
import { BridgeContext } from '../App/App'

import { useInterval } from '../common/Hooks'
import { L1TransactionReceipt, L1ToL2MessageStatus } from '@arbitrum/sdk'

const RetryableTxnsIncluder = (): JSX.Element => {
  const actions = useActions()
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()
  const bridge = useContext(BridgeContext)

  const checkAndUpdateFailedRetryables = useCallback(async () => {
    if (!bridge) {
      return
    }
    const failedRetryablesToRedeem = actions.app.getFailedRetryablesToRedeem()

    for (let depositTx of failedRetryablesToRedeem) {
      const depositTxRec = new L1TransactionReceipt(
        await bridge.l1Provider.getTransactionReceipt(depositTx.txId)
      ) //**TODO: not found, i.e., reorg */
      const l1ToL2Msg = await depositTxRec.getL1ToL2Message(
        bridge.l2Bridge.l2Signer
      )
      const status = await l1ToL2Msg.status()
      if (status !== L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
        arbTokenBridge?.transactions?.updateL1ToL2MsgData(
          depositTx.txId,
          l1ToL2Msg,
          status
        )
      }
    }
  }, [arbTokenBridge?.transactions?.addTransactions, bridge])

  /**
   * For every L1 deposit, we ensure the relevant L1ToL2MessageIsIncluded
   */
  const checkAndAddMissingL1ToL2Messagges = useCallback(async () => {
    if (!bridge) {
      return
    }

    const l1DepositsWithUntrackedL2Messages =
      actions.app.l1DepositsWithUntrackedL2Messages()

    for (let depositTx of l1DepositsWithUntrackedL2Messages) {
      const depositTxRec = new L1TransactionReceipt(
        await bridge.l1Provider.getTransactionReceipt(depositTx.txID)
      ) //**TODO: not found, i.e., reorg */
      const l1ToL2Msg = await depositTxRec.getL1ToL2Message(
        bridge.l2Bridge.l2Signer
      )

      arbTokenBridge?.transactions?.updateL1ToL2MsgData(
        depositTx.txID,
        l1ToL2Msg
      )
    }
  }, [arbTokenBridge?.transactions?.addTransactions, bridge])

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

export { RetryableTxnsIncluder }
