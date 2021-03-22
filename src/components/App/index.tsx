import React, { useEffect, useState, useMemo, useCallback } from 'react'
import styles from './styles.module.scss'
import { statement } from '@babel/template'
import { getInjectedWeb3, requestNetworkSwitch } from 'util/web3'
import * as ethers from 'ethers'
import Transactions from '../Transactions'
import {
  useArbTokenBridge,
  TokenType,
  ContractStorage,
  NewTransaction,
  AssetType
} from 'token-bridge-sdk'
import Header from 'components/Header'
import TabsContainer from 'components/TabsContainer'
import { useLocalStorage } from '@rehooks/local-storage'

import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import { BridgeConfig, connextTxn } from 'util/index'
import { useIsDepositMode } from 'components/App/ModeContext'
import AlertDialog from './Dialogue'
import { Bridge } from 'arb-ts'
interface AppProps {
  bridge : Bridge
}
const App = ( { bridge }:AppProps) => {
  // TODO:
  const arbProvider = bridge.l2Signer.provider as ethers.ethers.providers.Provider 
  const ethProvider = bridge.l1Bridge.l1Signer.provider as ethers.ethers.providers.Provider 

  const isDepositMode = useIsDepositMode()
  // const networkId =  arbProvider && arbProvider.network && arbProvider.network.chainId || 666

  const {
    walletAddress,
    balances,
    cache,
    token,
    bridgeTokens,
    eth,
    transactions,
    pendingWithdrawalsMap
  } = useArbTokenBridge(
    bridge
  )



  const [currentERC20Address, setCurrentERC20Address] = useLocalStorage(
    'currentERC20',
    ''
  )
  const [currentERC721Address, setCurrentERC721Address] = useLocalStorage(
    'currentERC721',
    ''
  )

  useEffect(() => {
    const allAddresses = Object.keys(bridgeTokens).sort()
    if (!currentERC20Address) {
      setCurrentERC20Address(allAddresses[0] || "")
    }

  }, [bridgeTokens])

  const erc20Balance = (() => {
    const { erc20 } = balances
    if (currentERC20Address && erc20 && erc20[currentERC20Address]) {
      return erc20[currentERC20Address]
    }
  })()
  const erc721Balance = (() => {
    const { erc721 } = balances
    if (currentERC721Address && erc721 && erc721 && [currentERC721Address]) {
      return erc721[currentERC721Address]
    }
  })()


  const { addTransaction, updateTransactionStatus } = transactions
  interface ConnextTxnParams{
    value: string,
    txID: string,
    assetName: string,
    assetType: AssetType,
    sender: string,
    type: 'connext-deposit' | 'connext-withdraw'

  }

  const handleConnextTxn: connextTxn = useCallback(
    async (newTxnData: ConnextTxnParams, )=>{
    addTransaction({
      ...newTxnData,
      status: 'pending',
    })
    const provider = newTxnData.type ==='connext-deposit' ?  arbProvider : ethProvider
    
    const receipt = await provider.waitForTransaction(newTxnData.txID)
    updateTransactionStatus(receipt)


  }, [arbProvider, addTransaction, updateTransactionStatus, ethProvider])
    useEffect(()=>{
      window.setInterval(()=>{
        eth.updateBalances()
      }, 3000)
    },[])

  return (
    <div className="container">
      {/* <button onClick={requestNetworkSwitch}>XXXXXXX</button> */}
      <div className="row">
        <Header
          ethAddress={walletAddress}
          ethBalance={balances.eth}
          erc20Balance={erc20Balance}
          erc721Balance={erc721Balance}
          bridgeTokens={bridgeTokens}
          currentERC20Address={currentERC20Address ?? ''}
          currentERC721Address={currentERC721Address ?? ''}
        />
        {/* <AlertDialog networkId={networkId} l2Network={l2Network}/> */}
      </div>
      <div className="row" id="bridgeRow">
        <div id="bridgebody">
          <TabsContainer
            ethBalances={balances.eth}
            erc20BridgeBalance={erc20Balance}
            addToken={token.add}
            eth={eth}
            token={token}
            erc721balance={erc721Balance}
            bridgeTokens={bridgeTokens}
            currentERC20Address={currentERC20Address ?? ''}
            currentERC721Address={currentERC721Address ?? ''}
            setCurrentERC20Address={setCurrentERC20Address}
            setCurrentERC721Address={setCurrentERC721Address}
            transactions={transactions.transactions}
            ethAddress={walletAddress}
            handleConnextTxn={handleConnextTxn}
            pendingWithdrawalsMap={pendingWithdrawalsMap}

          />
        </div>
      </div>
      <div className="row">
        <Transactions
          transactions={transactions.transactions}
          clearPendingTransactions={transactions.clearPendingTransactions}
          walletAddress={walletAddress}
          setTransactionConfirmed={transactions.setTransactionConfirmed}
          updateTransactionStatus={transactions.updateTransactionStatus}

        />
      </div>
    </div>
  )
}

export default App
