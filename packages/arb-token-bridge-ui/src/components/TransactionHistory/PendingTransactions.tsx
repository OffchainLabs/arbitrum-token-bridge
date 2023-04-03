import { motion } from 'framer-motion'
import { InformationCircleIcon } from '@heroicons/react/outline'
import { useSwitchNetwork } from 'wagmi'

import { MergedTransaction } from '../../state/app/state'
import { isDeposit } from '../../state/app/utils'
import { motionDivProps } from '../MainContent/MainContent'
import { DepositCard } from '../TransferPanel/DepositCard'
import { WithdrawalCard } from '../TransferPanel/WithdrawalCard'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import {
  ChainId,
  getNetworkName,
  handleSwitchNetworkError,
  isNetwork
} from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'
import { Loader } from '../common/atoms/Loader'

const getOtherL2NetworkChainId = (chainId: number) => {
  if (!isNetwork(chainId).isArbitrumOne && !isNetwork(chainId).isArbitrumNova) {
    console.warn(`[getOtherL2NetworkChainId] Unexpected chain id: ${chainId}`)
  }
  return isNetwork(chainId).isArbitrumOne
    ? ChainId.ArbitrumNova
    : ChainId.ArbitrumOne
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
  const { switchNetwork } = useSwitchNetwork({
    onError: handleSwitchNetworkError
  })

  const bgClassName = isNetwork(l2Network.chainID).isArbitrumNova
    ? 'bg-gray-10'
    : 'bg-blue-arbitrum'

  return (
    <div
      className={`pending-transactions relative flex max-h-[500px] flex-col gap-4 overflow-auto rounded-lg p-4 ${bgClassName}`}
    >
      {/* Heading */}
      <div className="heading flex items-center justify-between text-base text-white lg:text-lg">
        <div className="flex flex-nowrap items-center gap-x-3 whitespace-nowrap">
          {loading && <Loader color="white" size="small" />}
          Pending Transactions:{' '}
          {`${getNetworkName(l2Network.chainID)}/${getNetworkName(
            l1Network.chainID
          )}`}
        </div>

        {/* For mainnets, show the corresponding network to switch - One < > Nova */}
        {!isNetwork(l2Network.chainID).isTestnet && (
          <ExternalLink
            className="arb-hover cursor-pointer text-sm text-white underline"
            onClick={() => {
              switchNetwork?.(getOtherL2NetworkChainId(l2Network.chainID))
            }}
          >{`See ${getNetworkName(
            getOtherL2NetworkChainId(l2Network.chainID)
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
