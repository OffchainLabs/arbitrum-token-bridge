import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { ExternalLink } from '../common/ExternalLink'
import { useAccount } from 'wagmi'

export function OftTransactionHistoryDisclaimer() {
  const { address: walletAddress } = useAccount()

  return (
    <div className="mb-4 flex w-full flex-col gap-2 rounded bg-orange-dark/30 p-2 text-sm font-light text-white">
      <p className="flex flex-row items-center gap-1 font-bold">
        <InformationCircleIcon className="h-3 w-3" />
        Notice: USDT/USDT0 Transactions
      </p>
      <p className="text-xs">
        Transaction History for USDT/USDT0 Transfers (between Mainnet and
        Arbitrum One) made with LayerZero OFT protocol can be found on{' '}
        <ExternalLink
          href={`https://layerzeroscan.com/address/${walletAddress}`}
          className="underline hover:opacity-70"
        >
          LayerZero Scanner
        </ExternalLink>{' '}
        . We are working on integrating those directly into this transaction
        history page.
      </p>
    </div>
  )
}
