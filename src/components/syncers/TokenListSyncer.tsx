import React, { useEffect } from 'react'

import tokenList from 'src/media/token-list-42161.json'
import { TokenType } from 'token-bridge-sdk'

import { useAppState } from '../../state'

// TODO which list should I use
const tokens = [
  {
    address: '0xc7ad46e0b8a400bb3c915120d284aafba8fc4735',
    type: TokenType.ERC20
  },
  {
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    type: TokenType.ERC20
  }
]
const TokenListSyncer = (): JSX.Element => {
  const {
    app: { arbTokenBridge }
  } = useAppState()

  useEffect(() => {
    if (arbTokenBridge?.walletAddress) {
      tokens.forEach(token => {
        try {
          arbTokenBridge?.token?.add(token.address, TokenType.ERC20)
        } catch (ex) {
          // not interested in ex here for now
        }
      })
    }
  }, [arbTokenBridge?.walletAddress])

  return <></>
}

export { TokenListSyncer }
