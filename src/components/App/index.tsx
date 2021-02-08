import React, { useEffect, useState, useMemo } from 'react'
import styles from './styles.module.scss'
import { statement } from '@babel/template'
import { getInjectedWeb3 } from 'util/web3'
import * as ethers from 'ethers'
import Transactions from '../Transactions'
import {
  useArbTokenBridge,
  TokenType,
  ContractStorage,
  BridgeToken
} from 'token-bridge-sdk'
import Header from 'components/Header'
import TabsContainer from 'components/TabsContainer'
import { useLocalStorage } from '@rehooks/local-storage'

import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import { BridgeConfig } from 'util/index'
import { useIsDepositMode } from 'components/App/ModeContext'
import AlertDialog from './Dialogue'

const App = ({
  arbProvider,
  ethProvider,
  arbSigner,
  ethSigner,
  l2Network,
  setL2Network
}: BridgeConfig) => {
  const isDepositMode = useIsDepositMode()
  const networkId =  arbProvider && arbProvider.network && arbProvider.network.chainId || 666
  const rollupAddress = useMemo(()=>{
    if (isDepositMode){
      return l2Network === "v2" ? "0xC34Fd04E698dB75f8381BFA7298e8Ae379bFDA71" : "0x2e8aF9f74046D3E55202Fcfb893348316B142230"
    } else {
      return networkId  !== 152709604825713 ?  "0x2e8aF9f74046D3E55202Fcfb893348316B142230" :"0xC34Fd04E698dB75f8381BFA7298e8Ae379bFDA71"
    }
  }, [l2Network, isDepositMode, networkId])

  const {
    walletAddress,
    balances,
    cache,
    token,
    bridgeTokens,
    eth,
    transactions
  } = useArbTokenBridge(
    ethProvider,
    arbProvider,
    rollupAddress,
    ethSigner,
    arbSigner
  )


  const vmId = rollupAddress
  useEffect(() => {
    vmId && walletAddress && balances.update()
  }, [vmId, walletAddress])

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
    if (!currentERC20Address || !bridgeTokens[currentERC20Address]) {
      const firstERC20 = Object.values(bridgeTokens).find(
        token => token && token.type === TokenType.ERC20
      )
      firstERC20 &&
        setCurrentERC20Address(
          firstERC20.eth?.address || firstERC20.arb?.address
        )
    }

    if (!currentERC721Address || !bridgeTokens[currentERC721Address]) {
      const firstERC721 = Object.values(bridgeTokens).find(
        token => token && token.type === TokenType.ERC721
      )
      firstERC721 && setCurrentERC721Address(firstERC721.eth.address)
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

  return (
    <div className="container">
      <div className="row">
        <Header
          ethAddress={walletAddress}
          vmId={vmId}
          ethBalance={balances.eth}
          erc20Balance={erc20Balance}
          erc721Balance={erc721Balance}
          bridgeTokens={bridgeTokens}
          currentERC20Address={currentERC20Address ?? ''}
          currentERC721Address={currentERC721Address ?? ''}
          l2Network={l2Network}
          setL2Network={setL2Network}
          networkId={networkId}
        />
        <AlertDialog networkId={networkId} l2Network={l2Network}/>
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
            networkId={networkId}
          />
        </div>
      </div>
      <div className="row">
        <Transactions
          transactions={transactions.transactions}
          clearPendingTransactions={transactions.clearPendingTransactions}
          walletAddress={walletAddress}
          setTransactionConfirmed={transactions.setTransactionConfirmed}
          arbProvider={arbProvider}
          ethProvider={ethProvider}
          updateTransactionStatus={transactions.updateTransactionStatus}

        />
      </div>
    </div>
  )
}

export default App
