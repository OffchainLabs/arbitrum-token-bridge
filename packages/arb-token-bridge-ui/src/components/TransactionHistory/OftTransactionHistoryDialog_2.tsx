import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'
import { useAccount } from 'wagmi'

export function OftTransactionHistoryDialog(props: UseDialogProps) {
  const { address: walletAddress } = useAccount()

  return (
    <Dialog
      {...props}
      title="Track USDT Transaction"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col space-y-4 py-4">
        <p>USDT Transaction initiated successfully.</p>
        <p>
          Currently this transaction will not show up here in the Arbitrum
          Bridge UI Txn History. We are working on the integration.
        </p>
        <p>
          In order to track your USDT0 transactions, please visit{' '}
          <ExternalLink
            href={`https://layerzeroscan.com/address/${walletAddress}`}
            className="underline hover:opacity-70"
          >
            LayerZero Scanner
          </ExternalLink>{' '}
          to track your transactions for the time being.
        </p>
      </div>
    </Dialog>
  )
}
