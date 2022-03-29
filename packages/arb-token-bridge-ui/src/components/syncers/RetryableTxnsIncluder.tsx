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
    const l1DepositsWithUntrackedL2Messages = actions.app.l1DepositsWithUntrackedL2Messages()

    for (let depositTx of l1DepositsWithUntrackedL2Messages) {
      const depositTxRec = new L1TransactionReceipt(
        await bridge.l1Provider.getTransactionReceipt(depositTx.txID)
      ) //**TODO: not found, i.e., reorg */
      const l1ToL2Msg = await depositTxRec.getL1ToL2Message(bridge.l2Provider)

      arbTokenBridge?.transactions?.updateL1ToL2MsgData(
        depositTx.txID,
        l1ToL2Msg
      )
    }
  }, [bridge, arbTokenBridge?.transactions?.addTransactions])

  const { forceTrigger: forceTriggerUpdate } = useInterval(
    checkAndAddMissingL1ToL2Messagges,
    5000
  )
  useEffect(() => {
    // force trigger update each time loaded change happens
    forceTriggerUpdate()
  }, [arbTokenBridgeLoaded])

  return <></>
}

export { RetryableTxnsIncluder }
