import { motion } from 'framer-motion'
import { InformationCircleIcon } from '@heroicons/react/outline'
import Loader from 'react-loader-spinner'
import { OutgoingMessageState } from 'token-bridge-sdk'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { outgoungStateToString } from '../../state/app/utils'
import { motionDivProps } from '../MainContent/MainContent'
import { DepositCard } from '../TransferPanel/DepositCard'
import { WithdrawalCard } from '../TransferPanel/WithdrawalCard'

function isDeposit(tx: MergedTransaction) {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

export const PendingTransactions = ({
  transactions,
  loading,
  error
}: {
  transactions: MergedTransaction[]
  loading: boolean
  error: boolean
}) => {
  const filteredTransactions = transactions?.filter(
    tx =>
      (isDeposit(tx) &&
        (tx.status === 'pending' ||
          tx.depositStatus == DepositStatus.L1_PENDING ||
          tx.depositStatus === DepositStatus.L2_PENDING)) ||
      (!isDeposit(tx) &&
        tx.status !== outgoungStateToString[OutgoingMessageState.EXECUTED])
  )

  return (
    <div className="relative flex max-h-[500px] flex-col gap-4 overflow-auto rounded-lg bg-blue-arbitrum p-4">
      {/* Heading */}
      <span className="flex items-center gap-x-3 text-xl text-white">
        {loading ? (
          <Loader type="TailSpin" color="white" width={20} height={20} />
        ) : null}
        Pending Transactions
      </span>

      {/* Error loading transactions */}
      {error && (
        <span className="flex gap-x-2 text-sm text-red-400">
          <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
          Failed to load pending transactions
        </span>
      )}

      {/* No pending transactions */}
      {!error && !loading && !filteredTransactions.length && (
        <span className="flex gap-x-2 text-sm text-white opacity-40">
          No pending transactions
        </span>
      )}

      {/* Transaction cards */}
      {filteredTransactions?.map(tx =>
        isDeposit(tx) ? (
          <motion.div key={tx.txId} {...motionDivProps}>
            <DepositCard key={tx.txId} tx={tx} />
          </motion.div>
        ) : (
          <motion.div key={tx.txId} {...motionDivProps}>
            <WithdrawalCard key={tx.txId} tx={tx} />
          </motion.div>
        )
      )}
    </div>
  )
}
