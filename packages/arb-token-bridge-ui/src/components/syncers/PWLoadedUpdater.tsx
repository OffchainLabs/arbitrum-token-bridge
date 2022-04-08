import { useEffect } from 'react'

import { useActions, useAppState } from '../../state'
import { PendingWithdrawalsLoadedState } from '../../util'
import { useNetworks } from '../../hooks/useNetworks'
import { useSigners } from '../../hooks/useSigners'

// Loads pending withdrawals on page load
export function PWLoadedUpdater(): JSX.Element {
  const { l1Network, l2Network } = useNetworks()
  const { l2Signer } = useSigners()
  const actions = useActions()
  const {
    app: {
      arbTokenBridgeLoaded,
      pwLoadedState,
      arbTokenBridge: { setInitialPendingWithdrawals }
    }
  } = useAppState()

  useEffect(() => {
    if (
      typeof l1Network === 'undefined' ||
      typeof l2Network === 'undefined' ||
      !arbTokenBridgeLoaded ||
      pwLoadedState !== PendingWithdrawalsLoadedState.LOADING
    ) {
      return
    }
    const { l2ERC20Gateway, l2CustomGateway, l2WethGateway } =
      l2Network.tokenBridge

    const gatewaysToUse = [l2ERC20Gateway, l2CustomGateway, l2WethGateway]
    console.log('**** setting initial pending withdrawals ****')

    l2Signer?.getTransactionCount()?.then((nonce: number) => {
      if (nonce === 0) {
        console.log('Wallet has nonce of zero, no pending withdrawals to set')
        actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.READY)
      } else {
        const bridgeUpdateBlockNumber = 0

        console.log(
          `Nonce is ${nonce} and bridgeUpdateBlockNumber is ${bridgeUpdateBlockNumber}`
        )

        setInitialPendingWithdrawals(gatewaysToUse, {
          fromBlock: bridgeUpdateBlockNumber
        })
          .then(() => {
            console.info('Setting withdrawals to ready state')

            actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.READY)
          })
          .catch(ex => {
            console.warn('error getting setInitialPendingWithdrawals', ex)

            actions.app.setPWLoadingState(PendingWithdrawalsLoadedState.ERROR)
          })
      }
    })
  }, [l1Network, l2Network, arbTokenBridgeLoaded, pwLoadedState, l2Signer])

  return <></>
}
