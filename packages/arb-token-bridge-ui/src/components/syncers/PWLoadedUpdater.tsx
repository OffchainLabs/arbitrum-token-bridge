import { useContext, useEffect } from 'react'

import { useActions, useAppState } from '../../state'
import { PendingWithdrawalsLoadedState } from '../../util'
import networks from '../../util/networks'
import { BridgeContext } from '../App/App'

// Loads pending withdrawals on page load
const PWLoadedUpdater = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const actions = useActions()
  const {
    app: {
      networkID,
      arbTokenBridgeLoaded,
      pwLoadedState,
      arbTokenBridge: { setInitialPendingWithdrawals },
      l1NetworkDetails,
      l2NetworkDetails
    }
  } = useAppState()

  useEffect(() => {
    if (
      !arbTokenBridgeLoaded ||
      !l1NetworkDetails?.chainID ||
      !bridge ||
      pwLoadedState !== PendingWithdrawalsLoadedState.LOADING
    ) {
      return
    }
    const { l2ERC20Gateway, l2CustomGateway, l2WethGateway, l2DaiGateway } =
      bridge.l2Bridge.network.tokenBridge
    const gatewaysToUse = [
      l2ERC20Gateway,
      l2CustomGateway,
      l2WethGateway,
      l2DaiGateway
    ]
    console.log('**** setting initial pending withdrawals ****')

    bridge?.l2Signer?.getTransactionCount()?.then((nonce: number) => {
      if (nonce === 0) {
        console.log('Wallet has nonce of zero, no pending withdrawals to set')
        actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.READY)
      } else {
        const bridgeUpdateBlockNumber =
          (networks[l2NetworkDetails?.chainID || ''] &&
            networks[l2NetworkDetails?.chainID || '']
              .bridgeUpdateBlockNumber) ||
          0
        console.log(
          `Nonce is ${nonce} and bridgeUpdateBlockNumber is ${bridgeUpdateBlockNumber}`
        )
        /** TODO tmp for initial devnet ui */

        // setInitialPendingWithdrawals(gatewaysToUse, {
        //   fromBlock: bridgeUpdateBlockNumber
        // })
        //   .then(() => {
        //     console.info('Setting withdrawals to ready state')

        //     actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.READY)
        //   })
        //   .catch(ex => {
        //     console.warn('error getting setInitialPendingWithdrawals', ex)

        //     actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.ERROR)
        //   })
      }
    })
  }, [
    l1NetworkDetails?.chainID,
    bridge,
    arbTokenBridgeLoaded,
    networkID,
    pwLoadedState
  ])

  return <></>
}

export { PWLoadedUpdater }
