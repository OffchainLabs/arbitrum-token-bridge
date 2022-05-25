import { useState } from 'react'

import { useAppState } from '../../state'
import { Button } from '../common/Button'
import { TransactionsModal } from '../TransactionsModal/TransactionsModal'
import { TransactionsTable } from '../TransactionsTable/TransactionsTable'
import { TransferPanel } from '../TransferPanel/TransferPanel'

export function MainContent() {
  const {
    app: { mergedTransactions }
  } = useAppState()

  const [transactionsModalOpen, setTransactionModalOpen] = useState(false)

  return (
    <>
      <TransferPanel />

      {mergedTransactions?.length > 0 && (
        <div className="flex justify-center">
          <div className="w-full lg:px-8 max-w-1440px">
            <TransactionsTable transactions={mergedTransactions?.slice(0, 5)} />

            <div className="h-6" />

            {mergedTransactions?.length > 5 && (
              <div className="max-w-networkBox mx-auto mb-4">
                <Button
                  onClick={() => setTransactionModalOpen(true)}
                  variant="white"
                  className="w-full"
                >
                  View all
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <TransactionsModal
        isOpen={transactionsModalOpen}
        setIsOpen={setTransactionModalOpen}
      />
    </>
  )
}
