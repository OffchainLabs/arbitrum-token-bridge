import { useEffect } from 'react'

import { useActions, useAppState } from '../../state'
import { PendingWithdrawalsLoadedState } from '../../util'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'
import {
  l2DaiGatewayAddresses,
  l2wstETHGatewayAddresses
} from '../../util/networks'

// Loads pending withdrawals on page load
export function PWLoadedUpdater(): JSX.Element {
  const networksAndSigners = useNetworksAndSigners()
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
      networksAndSigners.status !== UseNetworksAndSignersStatus.CONNECTED ||
      !arbTokenBridgeLoaded ||
      pwLoadedState !== PendingWithdrawalsLoadedState.LOADING
    ) {
      return
    }

    const { l2 } = networksAndSigners

    const { l2ERC20Gateway, l2CustomGateway, l2WethGateway } =
      l2.network.tokenBridge

    const gatewaysToUse = [l2ERC20Gateway, l2CustomGateway, l2WethGateway]

    const l2DaiGateway = l2DaiGatewayAddresses[l2.network.chainID]
    const l2wstETHGateway = l2wstETHGatewayAddresses[l2.network.chainID]

    if (l2DaiGateway) {
      gatewaysToUse.push(l2DaiGateway)
    }

    if (l2wstETHGateway) {
      gatewaysToUse.push(l2wstETHGateway)
    }

    console.log('**** setting initial pending withdrawals ****')

    l2.signer.getTransactionCount()?.then((nonce: number) => {
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
  }, [networksAndSigners, arbTokenBridgeLoaded, pwLoadedState])

  return <></>
}
