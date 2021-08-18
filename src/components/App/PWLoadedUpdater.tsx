import React from 'react'
import { useEffect } from 'react'
import { useActions, useAppState } from '../../state'

import { networks } from 'arb-ts'
import { PendingWithdrawalsLoadedState } from '../../util'

const PWLoadedUpdater = (): JSX.Element => {
  // const actions = useActions()
  // const {
  //   app: {
  //     arbTokenBridge: { setInitialPendingWithdrawals },
  //     bridge,
  //     l1NetworkDetails
  //   }
  // } = useAppState()
  //
  // useEffect(() => {
  //   if (!setInitialPendingWithdrawals) {
  //     return
  //   }
  //   const { l2ERC20Gateway, l2CustomGateway, l2WethGateway } = networks[
  //     l1NetworkDetails?.chainID || ''
  //   ].tokenBridge
  //   const gatewaysToUse = [
  //     l2ERC20Gateway,
  //     l2CustomGateway,
  //     l2WethGateway
  //   ].filter(gw => gw)
  //   console.log('**** setting initial pending withdrawals ****')
  //
  //   bridge()
  //     .l2Signer.getTransactionCount()
  //     .then((nonce: number) => {
  //       if (nonce === 0) {
  //         console.log('Wallet has nonce of zero, no pending withdrawals to set')
  //         actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.READY)
  //       } else {
  //         setInitialPendingWithdrawals(gatewaysToUse)
  //           .then(() => {
  //             console.info('Setting withdawals to ready state')
  //
  //             actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.READY)
  //           })
  //           .catch(() => {
  //             console.warn('error getting setInitialPendingWithdrawals')
  //
  //             actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.ERROR)
  //           })
  //       }
  //     })
  // }, [l1NetworkDetails?.chainID, bridge, setInitialPendingWithdrawals])

  return <></>
}

export { PWLoadedUpdater }
