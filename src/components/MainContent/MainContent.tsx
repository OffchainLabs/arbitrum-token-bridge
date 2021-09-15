import React, { useState } from 'react'

import { useAppState } from '../../state'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { TransactionsModal } from '../TransactionsModal/TransactionsModal'
import { TransactionsTable } from '../TransactionsTable/TransactionsTable'
import { TransferPanel } from '../TransferPanel/TransferPanel'

const MainContent = () => {
  const {
    app: { mergedTransactions, networkID }
  } = useAppState()

  const [transactionsModalOpen, setTransactionModalOpen] = useState(false)

  const isMainnet = networkID === '1' || networkID === '42161'

  return (
    <div className="mx-auto px-4">
      {isMainnet && (
        <div className="mb-4">
          <Alert type="blue">
            NOTICE: You're using Arbitrum mainnet, still in beta phase. Be
            careful!
          </Alert>
        </div>
      )}

      <TransferPanel />

      {mergedTransactions?.length > 0 && (
        <>
          <TransactionsTable transactions={mergedTransactions?.slice(0, 5)} />

          <div className="h-6" />

          {mergedTransactions?.length > 5 && (
            <div className="max-w-networkBox mx-auto mb-4">
              <Button
                onClick={() => setTransactionModalOpen(true)}
                variant="white"
                size="md"
                className="w-full"
              >
                View all
              </Button>
            </div>
          )}
        </>
      )}

      <TransactionsModal
        isOpen={transactionsModalOpen}
        setIsOpen={setTransactionModalOpen}
      />
    </div>
  )
}

export default MainContent
