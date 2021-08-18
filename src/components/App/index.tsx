import React, { useEffect, useState, useCallback } from 'react'
import * as ethers from 'ethers'
import Transactions from '../Transactions'
import { useArbTokenBridge, AssetType } from 'token-bridge-sdk'
import Header from 'components/Header'
import TabsContainer from 'components/TabsContainer'
import { useLocalStorage } from '@rehooks/local-storage'

import { connextTxn, PendingWithdrawalsLoadedState } from 'util/index'
import { useL1Network } from 'components/App/NetworkContext'
import { networks } from 'arb-ts'
import { Button } from '../common/Button'
import { TransactionsTable } from '../common/TransactionsTable'
import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ArbTokenBridge } from '../../types/ArbTokenBridge'
import { Modal } from '../common/Modal'
import { TransactionsModal } from '../TransactionsModal/TransactionsModal'
import { Alert } from '../common/Alert'
import { useAppState } from '../../state'
import { WhiteListState } from '../../state/app/state'

const MainContent = () => {
  const {
    app: { verifying }
  } = useAppState()

  const [transactionsModalOpen, setTransactionModalOpen] = useState(false)

  // const ethProvider = bridge.l1Bridge.l1Signer
  //   .provider as ethers.ethers.providers.Provider

  // useEffect(() => {
  //   const allAddresses = Object.keys(bridgeTokens).sort()
  //   if (!currentERC20Address) {
  //     setCurrentERC20Address(allAddresses[0] || '')
  //   }
  // }, [bridgeTokens])

  if (verifying === WhiteListState.VERIFYING) {
    return <Alert type="blue">verifying...</Alert>
  }
  if (verifying === WhiteListState.DISALLOWED) {
    return (
      <Alert type="red">{`Stop! You are attempting to use Mainnet Beta with unapproved address {walletAddress}! \n\n  Switch to an approved address or connect to Rinkeby for our public testnet.`}</Alert>
    )
  }

  return (
    <div className="container mx-auto px-4">
      <TransferPanel />

      {/*<TransactionsTable transactions={transactions} />*/}

      <div className="h-6" />

      <div className="max-w-networkBox mx-auto mb-4">
        <Button
          onClick={() => setTransactionModalOpen(true)}
          variant="white"
          size="sm"
          className="w-full"
        >
          View all
        </Button>
      </div>

      <Modal
        title="All transactions"
        isOpen={transactionsModalOpen}
        setIsOpen={setTransactionModalOpen}
        hideButton
      >
        <TransactionsModal closeModal={() => setTransactionModalOpen(false)} />
      </Modal>
    </div>
  )
}

export default MainContent
