import { useAppContextActions, useAppContextState } from '../../App/AppContext'

export const TableSourceToggle = () => {
  const {
    layout: { isTransactionHistoryShowingSentTx }
  } = useAppContextState()
  const { setShowSentTransactions } = useAppContextActions()

  const buttonActiveClassName = 'pointer-events-none border-b-4 border-black'
  const buttonInactiveClassName = 'arb-hover border-b-2 pb-[1px] border-gray'

  return (
    <div className="sticky left-0 top-0 bg-white p-4 pt-6 text-lg">
      <button
        onClick={() => setShowSentTransactions(true)}
        className={
          isTransactionHistoryShowingSentTx
            ? buttonActiveClassName
            : buttonInactiveClassName
        }
      >
        <span className="px-4">Funds Sent</span>
      </button>

      <button
        onClick={() => setShowSentTransactions(false)}
        className={
          isTransactionHistoryShowingSentTx
            ? buttonInactiveClassName
            : buttonActiveClassName
        }
      >
        <span className="px-4">Funds Received</span>
      </button>
    </div>
  )
}
