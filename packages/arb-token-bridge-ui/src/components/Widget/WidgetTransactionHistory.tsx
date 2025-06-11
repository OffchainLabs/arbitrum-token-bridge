import { useAccount } from 'wagmi'
import { TransactionDetailsContent } from '../TransactionHistory/TransactionDetailsContent'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'

export const CROSS_CHAIN_TRANSACTIONS_STORAGE_KEY =
  'arbitrum:bridge:cross-chain-transactions'

const WidgetTransactionHistoryLoadingPlaceholder = () => {
  return (
    <div className="grid gap-4 min-[850px]:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="h-[80px] w-full animate-pulse rounded-md bg-white/20" />
        <div className="h-[80px] w-full animate-pulse rounded-md bg-white/20" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-[100px] w-full animate-pulse rounded-md bg-white/20" />
        <div className="h-[170px] w-full animate-pulse rounded-md bg-white/20" />
      </div>
    </div>
  )
}

export const WidgetTransactionHistory = (props: UseDialogProps) => {
  const { address: walletAddress } = useAccount()
  const { transactions, loading: isLoadingTransactions } =
    useTransactionHistory(walletAddress)
  const currentTx = transactions[0]
  const isLoading = transactions.length ? false : isLoadingTransactions

  return (
    <Dialog
      {...props}
      onClose={() => props.onClose(false)}
      actionButtonProps={{ hidden: true }}
      isFooterHidden={true}
      className="relative h-screen overflow-hidden"
    >
      <ExternalLink
        href="https://bridge.arbitrum.io/?tab=tx_history"
        className="absolute right-6 top-4 flex items-center gap-1 text-sm"
      >
        See full transaction history
        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
      </ExternalLink>

      <div className="my-3 flex flex-col gap-2">
        <div className="mt-2 text-lg">Latest Transaction Details</div>

        {isLoading && <WidgetTransactionHistoryLoadingPlaceholder />}

        {!isLoading && !currentTx && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">No transactions found</p>
          </div>
        )}

        {!isLoading && currentTx && (
          <TransactionDetailsContent
            tx={currentTx}
            walletAddress={walletAddress}
          />
        )}
      </div>
    </Dialog>
  )
}
