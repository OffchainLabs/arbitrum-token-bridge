import { motion } from 'framer-motion'
import { InformationCircleIcon } from '@heroicons/react/outline'
import { MergedTransaction } from '../../state/app/state'
import { isDeposit } from '../../state/app/utils'
import { motionDivProps } from '../MainContent/MainContent'
import { DepositCard } from '../TransferPanel/DepositCard'
import { WithdrawalCard } from '../TransferPanel/WithdrawalCard'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getNetworkName } from '../../util/networks'
import { Loader } from '../common/atoms/Loader'

export const PendingTransactions = ({
  transactions,
  loading,
  error
}: {
  transactions: MergedTransaction[]
  loading: boolean
  error: boolean
}) => {
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()

  return (
    <div className="relative flex max-h-[500px] flex-col gap-4 overflow-auto rounded-lg bg-blue-arbitrum p-4">
      {/* Heading */}
      <span className="flex flex-nowrap items-center gap-x-3 whitespace-nowrap text-xl text-white">
        {loading && <Loader color="white" size="small" />}
        {getNetworkName(l2Network.chainID)} Pending Transactions
      </span>

      {/* Error loading transactions */}
      {error && (
        <span className="flex gap-x-2 text-sm text-red-400">
          <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
          Failed to load pending transactions, please try refreshing the page
        </span>
      )}

      {/* No pending transactions */}
      {!error && !loading && !transactions.length && (
        <span className="flex gap-x-2 text-sm text-white opacity-40">
          No pending transactions
        </span>
      )}

      {/* Transaction cards */}
      {transactions?.map(tx =>
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
