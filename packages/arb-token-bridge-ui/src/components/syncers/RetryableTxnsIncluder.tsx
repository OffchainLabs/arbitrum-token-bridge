import { useCallback, useContext, useEffect } from 'react'
import { useActions, useAppState } from '../../state'
import { BridgeContext } from '../App/App'
import { useInterval } from '../common/Hooks'
import { L1TransactionReceipt } from '@arbitrum/sdk'

const RetryableTxnsIncluder = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const actions = useActions()
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()

  /**
   * For every L1 deposit, we ensure the relevant L1ToL2MessageIsIncluded
   */
  const checkAndAddMissingL1ToL2Messagges = useCallback(async () => {
    if (!bridge) {
      return
    }

    const successfulL1Deposits = actions.app.getSuccessfulL1Deposits()

    for (let depositTx of successfulL1Deposits.filter(
      depositTx => !depositTx.l1ToL2MsgData
    )) {
      const depositTxRec = new L1TransactionReceipt(
        await bridge.l1Provider.getTransactionReceipt(depositTx.txID)
      ) //**todo: not found, i.e., reorg */
      const l1ToL2Msgs = await depositTxRec.getL1ToL2Messages(bridge.l1Provider)
      if (l1ToL2Msgs.length !== 1) {
        // TODO: error handle
      }

      const l1ToL2Msg = l1ToL2Msgs[0]
      arbTokenBridge?.transactions?.addL1ToL2MsgToDepositTxn(
        depositTx.txID,
        l1ToL2Msg
      )
    }
  }, [bridge, arbTokenBridge?.transactions?.addTransactions])

  const { forceTrigger: forceTriggerUpdate } = useInterval(
    checkAndAddMissingL1ToL2Messagges,
    4000
  )
  useEffect(() => {
    // force trigger update each time loaded change happens
    forceTriggerUpdate()
  }, [arbTokenBridgeLoaded])

  return <></>
}

export { RetryableTxnsIncluder }
