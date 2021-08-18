import { TransactionsTable } from 'components/common/TransactionsTable'
import React, { useState } from 'react'
import { useAppState } from '../../state'
import { WhiteListState } from '../../state/app/state'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { TransactionsModal } from '../TransactionsModal/TransactionsModal'
import { TransferPanel } from '../TransferPanel/TransferPanel'

const MainContent = () => {
  const {
    app: { verifying, arbTokenBridge }
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

      {/* <TransactionsTable transactions={transactions} /> */}

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
