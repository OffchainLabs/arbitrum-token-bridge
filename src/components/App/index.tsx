import React, { useEffect, useState } from 'react'
import styles from './styles.module.scss'
import { statement } from '@babel/template'
import { getInjectedWeb3 } from 'util/web3'
import * as ethers from 'ethers'
import * as ArbProviderEthers from 'arb-provider-ethers'
import { ArbProvider } from 'arb-provider-ethers'
<<<<<<< HEAD
import { useArbTokenBridge } from 'arb-token-bridge'
import Header from 'components/Header'
import TabsContainer from 'components/TabsContainer'
=======
import { useArbTokenBridge, TokenType } from 'hooks/useArbTokenBridge'
import Header from 'components/Header'
import TabsContainer from 'components/TabsContainer'
import { useLocalStorage } from '@rehooks/local-storage'
>>>>>>> 19db7c8... front-end updates, squashed

import 'bootstrap/dist/css/bootstrap.min.css'

const validatorUrl = process.env.REACT_APP_ARB_VALIDATOR_URL || ''
// const validatorUrl = 'http://64.225.27.132:1235'

const App = () => {
  const {
    walletAddress,
    balances,
    vmId,
    cache,
    token,
    bridgeTokens
  } = useArbTokenBridge(validatorUrl, getInjectedWeb3())
  useEffect(() => {
    vmId && walletAddress && balances.update()
  }, [vmId, walletAddress])

  const [currentERC20Address, setCurrentERC20Address] = useLocalStorage('')

  useEffect(() => {
    if (!currentERC20Address || !bridgeTokens[currentERC20Address]) {
      const allERC20Addresses = Object.keys(bridgeTokens)
      allERC20Addresses.length && setCurrentERC20Address(allERC20Addresses[0])
    }
  }, [bridgeTokens])

  const ercBalance = (() => {
    if (currentERC20Address && balances.erc20[currentERC20Address]) {
      return balances.erc20[currentERC20Address]
    }
  })()

  return (
    <div className="container" onClick={balances.update}>
      <div className="row">
        <Header ethAddress={walletAddress ?? ''} vmId={vmId ?? ''} />
      </div>
      <div className="row">
        <div id="bridgebody">
          <TabsContainer
            erc20sCached={cache.erc20}
            ethBalances={balances.eth}
            erc20BridgeBalance={ercBalance}
            addToken={token.add}
          />
        </div>
      </div>
    </div>
  )
}

export default App
