import React, { useState, useEffect } from 'react'
import styles from './styles.module.scss'
import { statement } from '@babel/template'
import { getInjectedWeb3 } from 'util/web3'
import * as ethers from 'ethers'
import * as ArbProviderEthers from 'arb-provider-ethers'
import { ArbProvider } from 'arb-provider-ethers'
import useArbHook from 'hooks/arbHook'
import Header from 'components/Header'
import TabsContainer from 'components/TabsContainer'

import 'bootstrap/dist/css/bootstrap.min.css'

const App = () => {
  const [{ ethAddress, vmId }, updateWallets] = useArbHook()

  return (
    <div className="container">
      <div className="row">
        <Header ethAddress={ethAddress} vmId={vmId} />
      </div>
      <div className="row">
        <div id="bridgebody">
          <TabsContainer />
        </div>
      </div>
    </div>
  )
}

export default App
