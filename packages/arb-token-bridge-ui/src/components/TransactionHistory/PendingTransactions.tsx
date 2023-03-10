import { motion } from 'framer-motion'
import { InformationCircleIcon } from '@heroicons/react/outline'
import Loader from 'react-loader-spinner'
import { MergedTransaction } from '../../state/app/state'
import { isDeposit } from '../../state/app/utils'
import { motionDivProps } from '../MainContent/MainContent'
import { DepositCard } from '../TransferPanel/DepositCard'
import { WithdrawalCard } from '../TransferPanel/WithdrawalCard'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import {
  ChainId,
  getNetworkName,
  isNetwork,
  switchChain
} from '../../util/networks'
import { useWallet } from '@arbitrum/use-wallet'
import { Web3Provider } from '@ethersproject/providers'
import { ExternalLink } from '../common/ExternalLink'

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
  const { provider } = useWallet()

  const bgClassName =
    l2Network.chainID === ChainId.ArbitrumNova
      ? 'bg-gray-10'
      : 'bg-blue-arbitrum'

  const switchNetworkMapping: { [chainId: number]: number } = {
    [ChainId.ArbitrumOne]: ChainId.ArbitrumNova,
    [ChainId.ArbitrumNova]: ChainId.ArbitrumOne
  }

  return (
    <div
      className={`relative flex max-h-[500px] flex-col gap-4 overflow-auto rounded-lg p-4 ${bgClassName}`}
    >
      {/* Heading */}
      <div className="flex items-center justify-between text-lg text-white">
        <div className="flex flex-nowrap items-center gap-x-3 whitespace-nowrap">
          {loading && (
            <Loader type="TailSpin" color="white" width={20} height={20} />
          )}
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
              switchChain({
                chainId: Number(switchNetworkMapping[l2Network.chainID]),
                provider: provider as Web3Provider
              })
            }}
          >{`See ${getNetworkName(
            Number(switchNetworkMapping[l2Network.chainID])
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
