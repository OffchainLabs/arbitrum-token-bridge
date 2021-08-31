import React, { useContext, useEffect } from 'react'

import { TokenType, tokenLists } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import { BridgeContext } from '../App/App'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const {
    app: { arbTokenBridge, networkID }
  } = useAppState()

  useEffect(() => {
    if (!arbTokenBridge?.walletAddress || !networkID) {
      return
    }
    tokenLists[networkID]?.whiteList.forEach(token => {
      bridge
        ?.getAndUpdateL1TokenData(token.address) // check if exsits first before adding, because sdk will add to the cache even if it does not exist
        .then(() => {
          console.log('Adding token', token)
          try {
            arbTokenBridge?.token?.add(
              token.address.toLowerCase(),
              TokenType.ERC20
            )
          } catch (ex) {
            // not interested in ex here for now
          }
        })
        .catch(() => {
          console.log(
            `Tried to add ${token} but it is not deployed on the current network`
          )
        })
    })
  }, [arbTokenBridge?.walletAddress, networkID])

  return <></>
}

export { TokenListSyncer }
