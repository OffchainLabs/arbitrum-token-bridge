import React, { useEffect, useState, useCallback } from 'react'
import styles from './styles.module.scss'
import * as ethers from 'ethers'
import Transactions from '../Transactions'
import { useArbTokenBridge, AssetType } from 'token-bridge-sdk'
import Header from 'components/Header'
import TabsContainer from 'components/TabsContainer'
import { useLocalStorage } from '@rehooks/local-storage'

import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import { connextTxn, PendingWithdrawalsLoadedState } from 'util/index'
import Alert from 'react-bootstrap/Alert'
import { useL1Network, useL2Network } from 'components/App/NetworkContext'
import { Bridge, networks } from 'arb-ts'
import  Networks, { MAINNET_WHITELIST_ADDRESS } from './networks'
import { renderAlert } from './Injecter'
enum WhiteListState {
  VERIFYING,
  ALLOWED,
  DISALLOWED
}

interface AppProps {
  bridge: Bridge
}

const App = ({ bridge }: AppProps) => {
  const [whiteListState, setWhiteListState] = useState(WhiteListState.ALLOWED)
  const [pwLoadedState, setPWLoadedState] = useState(
    PendingWithdrawalsLoadedState.LOADING
  )
  // TODO:
  const arbProvider = bridge.l2Bridge.l2Signer
    .provider as ethers.ethers.providers.Provider
  const ethProvider = bridge.l1Bridge.l1Signer
    .provider as ethers.ethers.providers.Provider

  const l1NetworkID = useL1Network().chainID as string
  const l2NetworkID = useL2Network().chainID as string

  const {
    walletAddress,
    balances,
    token,
    bridgeTokens,
    eth,
    transactions,
    pendingWithdrawalsMap,
    setInitialPendingWithdrawals
  } = useArbTokenBridge(bridge)

  const [currentERC20Address, setCurrentERC20Address] = useLocalStorage(
    'currentERC20',
    ''
  )

  useEffect(() => {
    const allAddresses = Object.keys(bridgeTokens).sort()
    if (!currentERC20Address) {
      setCurrentERC20Address(allAddresses[0] || '')
    }
  }, [bridgeTokens])

  const erc20Balance = (() => {
    const { erc20 } = balances
    if (currentERC20Address && erc20 && erc20[currentERC20Address]) {
      return erc20[currentERC20Address]
    }
  })()

  const { addTransaction, updateTransaction } = transactions
  interface ConnextTxnParams {
    value: string
    txID: string
    assetName: string
    assetType: AssetType
    sender: string
    type: 'connext-deposit' | 'connext-withdraw'
  }

  useEffect(() => {
    balances.update()
    window.setInterval(() => {
      eth.updateBalances()
    }, 10000)
    window.setInterval(() => {
      token.updateBalances()
    }, 20000)
  }, [])
  useEffect(() => {
    const { l2ERC20Gateway, l2CustomGateway, l2WethGateway } = networks[
      l1NetworkID
    ].tokenBridge
    const gatewaysToUse = [
      l2ERC20Gateway,
      l2CustomGateway,
      l2WethGateway
    ].filter(gw => gw)
    console.log('**** starting: getting initial pending withdrawals ****')

    bridge.l2Signer.getTransactionCount().then((nonce: number) => {
      if (nonce === 0) {
        console.log('Wallet has nonce of zero, no pending withdrawals to set')
        setPWLoadedState(PendingWithdrawalsLoadedState.READY)
      } else {
        const bridgeUpdateBlockNumber = (Networks[l2NetworkID] &&  Networks[l2NetworkID].bridgeUpdateBlockNumber) || 0        
        setInitialPendingWithdrawals(gatewaysToUse, { fromBlock:bridgeUpdateBlockNumber  })
          .then((res: any) => {
            console.info('Setting withdrawals to ready state')

            setPWLoadedState(PendingWithdrawalsLoadedState.READY)
          })
          .catch((e:any) => {
            console.warn('error getting setInitialPendingWithdrawals',e)

            setPWLoadedState(PendingWithdrawalsLoadedState.ERROR)
          })
      }
    })
  }, [l1NetworkID])

  if (whiteListState === WhiteListState.VERIFYING) {
    return renderAlert('verifying...', 'primary')
  }
  if (whiteListState === WhiteListState.DISALLOWED) {
    return renderAlert(
      `Stop! You are attempting to use Mainnet Beta with unapproved address ${walletAddress}! \n\n  Switch to an approved address or connect to Rinkeby for our public testnet.`,
      'danger'
    )
  }

  return (
    <div className="container">
      {l1NetworkID === '1' ? (
        <Alert variant={'danger'}>
          <b>
            NOTICE: You're connected to mainnet, still in beta phase. BE
            CAREFUL!
          </b>
        </Alert>
      ) : null}

      <div className="row">
        <Header
          ethAddress={walletAddress}
          ethBalance={balances.eth}
          erc20Balance={erc20Balance}
          bridgeTokens={bridgeTokens}
          currentERC20Address={currentERC20Address ?? ''}
        />
      </div>
      <div className="row" id="bridgeRow">
        <div id="bridgebody">
          <TabsContainer
            ethBalances={balances.eth}
            erc20BridgeBalance={erc20Balance}
            addToken={token.add}
            eth={eth}
            token={token}
            bridgeTokens={bridgeTokens}
            currentERC20Address={currentERC20Address ?? ''}
            setCurrentERC20Address={setCurrentERC20Address}
            transactions={transactions.transactions}
            ethAddress={walletAddress}
            pendingWithdrawalsMap={pendingWithdrawalsMap}
            ethProvider={ethProvider}
          />
        </div>
      </div>
      <div className="row">
        <Transactions
          ethProvider={bridge.l1Bridge.l1Provider}
          arbProvider={bridge.l2Bridge.l2Provider}
          transactions={transactions.transactions}
          clearPendingTransactions={transactions.clearPendingTransactions}
          walletAddress={walletAddress}
          setTransactionConfirmed={transactions.setTransactionConfirmed}
          updateTransactionStatus={transactions.updateTransaction}
        />
      </div>
    </div>
  )
}

export default App
