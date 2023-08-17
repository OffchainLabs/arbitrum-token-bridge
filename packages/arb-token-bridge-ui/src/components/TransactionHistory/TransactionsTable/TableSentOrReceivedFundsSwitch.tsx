import { twMerge } from 'tailwind-merge'

import { useAppContextActions, useAppContextState } from '../../App/AppContext'
import { isNetwork } from '../../../util/networks'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'

export const TableSentOrReceivedFundsSwitch = ({
  className
}: {
  className: string
}) => {
  const {
    layout: { isTransactionHistoryShowingSentTx }
  } = useAppContextState()
  const { showSentTransactions, showReceivedTransactions } =
    useAppContextActions()
  const {
    l2: {
      network: { id: l2NetworkId }
    }
  } = useNetworksAndSigners()

  const { isArbitrumNova } = isNetwork(l2NetworkId)

  const buttonActiveClassName = 'pointer-events-none border-b-4 border-black'
  const buttonInactiveClassName = 'arb-hover border-b-2 pb-[1px] border-gray'

  if (isArbitrumNova) return null

  return (
    <div
      className={twMerge(
        'sticky left-0 top-0 rounded-tr-lg bg-white p-4 pt-6 text-lg',
        className
      )}
    >
      <button
        onClick={showSentTransactions}
        className={
          isTransactionHistoryShowingSentTx
            ? buttonActiveClassName
            : buttonInactiveClassName
        }
      >
        <span className="px-4">Funds Sent</span>
      </button>

      <button
        onClick={showReceivedTransactions}
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
