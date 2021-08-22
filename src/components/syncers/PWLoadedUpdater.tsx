import React, { useContext, useEffect } from 'react'

import { networks } from 'arb-ts'

import { useActions, useAppState } from '../../state'
import { PendingWithdrawalsLoadedState } from '../../util'
import { BridgeContext } from '../App/App'

const PWLoadedUpdater = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const actions = useActions()
  const {
    app: {
      arbTokenBridgeLoaded,
      arbTokenBridge: { setInitialPendingWithdrawals },
      l1NetworkDetails
    }
  } = useAppState()

  useEffect(() => {
    if (!arbTokenBridgeLoaded || !l1NetworkDetails?.chainID || !bridge) {
      return
    }
    const { l2ERC20Gateway, l2CustomGateway, l2WethGateway } =
      networks[l1NetworkDetails?.chainID || ''].tokenBridge
    const gatewaysToUse = [l2ERC20Gateway, l2CustomGateway, l2WethGateway]
    console.log('**** setting initial pending withdrawals ****')

    bridge?.l2Signer?.getTransactionCount()?.then((nonce: number) => {
      if (nonce === 0) {
        console.log('Wallet has nonce of zero, no pending withdrawals to set')
        actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.READY)
      } else {
        setInitialPendingWithdrawals(gatewaysToUse)
          .then(() => {
            console.info('Setting withdawals to ready state')

            actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.READY)
          })
          .catch(() => {
            console.warn('error getting setInitialPendingWithdrawals')

            actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.ERROR)
          })
      }
    })
  }, [l1NetworkDetails?.chainID, bridge, arbTokenBridgeLoaded])

  return <></>
}

export { PWLoadedUpdater }
