import React, { useState } from 'react'

import { useAppState } from '../../state'
import { Button } from '../common/Button'
import { TransactionsModal } from '../TransactionsModal/TransactionsModal'
import { TransactionsTable } from '../TransactionsTable/TransactionsTable'
import { TransferPanel } from '../TransferPanel/TransferPanel'

const MainContent = () => {
  const {
    app: { mergedTransactions }
  } = useAppState()

  const [transactionsModalOpen, setTransactionModalOpen] = useState(false)

  return (
    <div className="container mx-auto px-4">
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
