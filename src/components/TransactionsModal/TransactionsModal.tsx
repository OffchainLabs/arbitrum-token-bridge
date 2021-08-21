import React from 'react'

import { useAppState } from '../../state'
import { Modal } from '../common/Modal'
import { TransactionsTable } from '../TransactionsTable/TransactionsTable'

export const TransactionsModalBody = (): JSX.Element => {
  const {
    app: {
      arbTokenBridge: {
        transactions: { transactions }
      }
    }
  } = useAppState()

  return (
    <div>
      <TransactionsTable transactions={transactions} />
    </div>
  )
}

const TransactionsModal = ({
  isOpen,
  setIsOpen
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}): JSX.Element => {
  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} wide title="Transactions">
      <TransactionsModalBody />
    </Modal>
  )
}

export { TransactionsModal }
