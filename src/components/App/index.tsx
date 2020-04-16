import React, { useEffect, useState } from 'react'
import styles from './styles.module.scss'
import { statement } from '@babel/template'
import { getInjectedWeb3 } from 'util/web3'
import * as ethers from 'ethers'
import * as ArbProviderEthers from 'arb-provider-ethers'
import { ArbProvider } from 'arb-provider-ethers'
import { useArbTokenBridge } from 'arb-token-bridge'
import Header from 'components/Header'
import TabsContainer from 'components/TabsContainer'

import 'bootstrap/dist/css/bootstrap.min.css'

const validatorUrl = process.env.REACT_APP_ARB_VALIDATOR_URL || ''
// const validatorUrl = 'http://64.225.27.132:1235'

const App = () => {
  const { walletAddress, balances, vmId } = useArbTokenBridge(
    validatorUrl,
    getInjectedWeb3()
  )

  return (
    <div className="container" onClick={balances.update}>
      <div className="row">
        <Header ethAddress={walletAddress ?? ''} vmId={vmId ?? ''} />
      </div>
      <div className="row">
        <div id="bridgebody">
          <TabsContainer ethBalances={balances.eth} />
        </div>
      </div>
    </div>
  )
}

export default App
