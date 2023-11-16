import { motion } from 'framer-motion'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

import { MergedTransaction } from '../../state/app/state'
import { isDeposit, isTokenDeposit } from '../../state/app/utils'
import { motionDivProps } from '../MainContent/MainContent'
import { DepositCard } from '../TransferPanel/DepositCard'
import { WithdrawalCard } from '../TransferPanel/WithdrawalCard'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { ChainId, getNetworkName, isNetwork } from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'
import { Loader } from '../common/atoms/Loader'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { PendingDepositWarning } from './PendingDepositWarning'
import { ClaimableCardConfirmed } from '../TransferPanel/ClaimableCardConfirmed'
import { ClaimableCardUnconfirmed } from '../TransferPanel/ClaimableCardUnconfirmed'

const getOtherL2NetworkChainId = (chainId: number) => {
  if (isNetwork(chainId).isEthereum) {
    console.warn(`[getOtherL2NetworkChainId] Unexpected chain id: ${chainId}`)
  }
  return isNetwork(chainId).isArbitrumOne
    ? ChainId.ArbitrumNova
    : ChainId.ArbitrumOne
}

const MergedTransactionCard = ({
  transaction
}: {
  transaction: MergedTransaction
}) => {
  if (transaction.isCctp) {
    return (
      <motion.div key={transaction.txId} {...motionDivProps}>
        {transaction.status === 'Confirmed' ? (
          <ClaimableCardConfirmed tx={transaction} />
        ) : (
          <ClaimableCardUnconfirmed tx={transaction} />
        )}
      </motion.div>
    )
  }

  return isDeposit(transaction) ? (
    <motion.div key={transaction.txId} {...motionDivProps}>
      <DepositCard key={transaction.txId} tx={transaction} />
    </motion.div>
  ) : (
    <motion.div key={transaction.txId} {...motionDivProps}>
      <WithdrawalCard key={transaction.txId} tx={transaction} />
    </motion.div>
  )
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
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const { switchNetwork } = useSwitchNetworkWithConfig()

  const bgClassName = isNetwork(l2Network.id).isArbitrumNova
    ? 'bg-gray-dark'
    : 'bg-ocl-blue'

  return (
    <div
      className={`pending-transactions relative flex max-h-[500px] flex-col gap-4 overflow-auto rounded-lg p-4 ${bgClassName}`}
    >
      {/* Heading */}
      <div className="heading flex items-center justify-between text-base text-white lg:text-lg">
        <div className="flex flex-nowrap items-center gap-x-3 whitespace-nowrap">
          {loading && <Loader color="white" size="small" />}
          Pending Transactions:{' '}
          {`${getNetworkName(l2Network.id)}/${getNetworkName(l1Network.id)}`}
        </div>

        {/* For mainnets, show the corresponding network to switch - One < > Nova */}
        {!isNetwork(l2Network.id).isTestnet && (
          <ExternalLink
            className="arb-hover cursor-pointer text-sm text-white underline"
            onClick={() => {
              switchNetwork?.(getOtherL2NetworkChainId(l2Network.id))
            }}
          >{`See ${getNetworkName(
            getOtherL2NetworkChainId(l2Network.id)
          )}`}</ExternalLink>
        )}
      </div>

      {/* Error loading transactions */}
      {error && (
        <span className="flex gap-x-2 text-sm text-red-400">
          <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
          Failed to load pending transactions, please try refreshing the page
        </span>
      )}

      {/* No pending transactions */}
      {!error && !loading && transactions.length === 0 && (
        <span className="flex gap-x-2 text-sm text-white opacity-40">
          No pending transactions
        </span>
      )}

      {transactions.length > 0 &&
        transactions.some(tx => isTokenDeposit(tx)) && (
          <PendingDepositWarning />
        )}

      {/* Transaction cards */}
      {transactions.map(tx => (
        <MergedTransactionCard transaction={tx} key={tx.txId} />
      ))}
    </div>
  )
}
