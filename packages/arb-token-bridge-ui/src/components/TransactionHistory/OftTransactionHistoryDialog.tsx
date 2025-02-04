import { CheckBadgeIcon } from '@heroicons/react/24/outline'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'
import { useAccount } from 'wagmi'

export function OftTransactionHistoryDialog(props: UseDialogProps) {
  const { address: walletAddress } = useAccount()

  return (
    <Dialog
      {...props}
      title="Transfer Initiated Successfully"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col space-y-4 py-4">
        <p className="flex items-center gap-1">
          <CheckBadgeIcon className="h-4 w-4 text-green-500" />
          USDT Transfer initiated successfully.
        </p>
        <p>
          Currently this transaction will not show up in the Transaction History
          here, since it was not bridged through the canonical Arbitrum Bridge
          protocol.
        </p>
        <p>
          While we work on integrating USDT transaction tracking here, please
          visit{' '}
          <ExternalLink
            href={`https://layerzeroscan.com/address/${walletAddress}`}
            className="underline hover:opacity-70"
          >
            LayerZero Scanner
          </ExternalLink>{' '}
          to track your USDT transfers for the time being.
        </p>
      </div>
    </Dialog>
  )
}
