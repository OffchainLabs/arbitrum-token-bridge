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
import { useL1Network } from 'components/App/NetworkContext'
import { Bridge, networks } from 'arb-ts'
import { MAINNET_WHITELIST_ADDRESS } from './networks'
import { renderAlert } from './Injecter'
import { L1NetworkBox } from '../common/L1NetworkBox'
import { NetworkSwitchButton } from '../common/NetworkSwitchButton'
import { L2NetworkBox } from '../common/L2NetworkBox'
import { Button } from '../common/Button'
import { StatusBadge } from '../common/StatusBadge'
import { TransactionsTable } from '../common/TransactionsTable'
enum WhiteListState {
  VERIFYING,
  ALLOWED,
  DISALLOWED
}

interface AppProps {
  bridge: Bridge
}

const App = ({ bridge }: AppProps) => {
  const [whiteListState, setWhiteListState] = useState(WhiteListState.VERIFYING)
  const [pwLoadedState, setPWLoadedState] = useState(
    PendingWithdrawalsLoadedState.LOADING
  )
  // TODO:
  const arbProvider = bridge.l2Bridge.l2Signer
    .provider as ethers.ethers.providers.Provider
  const ethProvider = bridge.l1Bridge.l1Signer
    .provider as ethers.ethers.providers.Provider

  const l1NetworkID = useL1Network().chainID

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

  useEffect(() => {
    if (!walletAddress) return
    if (l1NetworkID !== '1') {
      setWhiteListState(WhiteListState.ALLOWED)
    } else {
      bridge
        .isWhiteListed(walletAddress, MAINNET_WHITELIST_ADDRESS)
        .then(isAllowed => {
          setWhiteListState(
            isAllowed ? WhiteListState.ALLOWED : WhiteListState.DISALLOWED
          )
        })
    }
  }, [l1NetworkID, walletAddress])

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
      setCurrentERC20Address(allAddresses[0] || '')
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
  interface ConnextTxnParams {
    value: string
    txID: string
    assetName: string
    assetType: AssetType
    sender: string
    type: 'connext-deposit' | 'connext-withdraw'
  }

  const handleConnextTxn: connextTxn = useCallback(
    async (newTxnData: ConnextTxnParams) => {
      addTransaction({
        ...newTxnData,
        status: 'pending'
      })
      const provider =
        newTxnData.type === 'connext-deposit' ? arbProvider : ethProvider

      const receipt = await provider.waitForTransaction(newTxnData.txID)
      updateTransactionStatus(receipt)
    },
    [arbProvider, addTransaction, updateTransactionStatus, ethProvider]
  )
  useEffect(() => {
    window.setInterval(() => {
      balances.update()
    }, 5000)
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
    console.log('**** setting initial pending withdrawals ****')

    bridge.l2Signer.getTransactionCount().then((nonce: number) => {
      if (nonce === 0) {
        console.log('Wallet has nonce of zero, no pending withdrawals to set')
        setPWLoadedState(PendingWithdrawalsLoadedState.READY)
      } else {
        setInitialPendingWithdrawals(gatewaysToUse)
          .then((res: any) => {
            console.info('Setting withdawals to ready state')

            setPWLoadedState(PendingWithdrawalsLoadedState.READY)
          })
          .catch(() => {
            console.warn('error getting setInitialPendingWithdrawals')

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

  console.log('TRANSACTIONS', transactions)

  return (
    <>
      <div className="flex justify-between max-w-networkBox mx-auto mb-4">
        <div></div>
        <StatusBadge />
      </div>
      <div className="flex flex-col w-full max-w-networkBox mx-auto mb-8">
        <div className="flex flex-col">
          <L1NetworkBox
            balance={balances.eth}
            address={walletAddress}
            className="order-1"
          />
          <div className="h-2 relative flex justify-center order-2">
            <div className="flex items-center justify-center">
              <NetworkSwitchButton />
            </div>
          </div>
          <L2NetworkBox
            balance={balances.eth}
            address={walletAddress}
            className="order-3"
          />
        </div>

        <div className="h-6" />
        <Button>Deposit</Button>
      </div>

      <TransactionsTable />

      <div className="h-6" />

      <div className="max-w-networkBox mx-auto mb-4">
        <Button variant="white" size="sm" className="w-full">
          View all
        </Button>
      </div>

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
            erc721Balance={erc721Balance}
            bridgeTokens={bridgeTokens}
            currentERC20Address={currentERC20Address ?? ''}
            currentERC721Address={currentERC721Address ?? ''}
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
            updateTransactionStatus={transactions.updateTransactionStatus}
          />
        </div>
      </div>
    </>
  )
}

export default App
