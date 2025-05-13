import { useAccount } from 'wagmi'
import { QueueListIcon } from '@heroicons/react/24/outline'
import { DialogWrapper, useDialog2 } from '../common/Dialog2'
import { WidgetHeaderAccountButton } from './WidgetHeaderAccountButton'
import { WidgetRoutes } from './WidgetRoutes'
import { WidgetTosConfirmationCheckbox } from './WidgetTosConfirmationCheckbox'
import { MoveFundsButton } from '../TransferPanel/MoveFundsButton'
import { ConnectWalletButton } from '../TransferPanel/ConnectWalletButton'
import { TransferPanelMain } from '../TransferPanel/TransferPanelMain'
import { TokenImportDialog } from '../TransferPanel/TokenImportDialog'
import { UseDialogProps } from '../common/Dialog'

type WidgetTransferPanelProps = {
  moveFundsButtonOnClick: () => void
  isTokenAlreadyImported?: boolean
  tokenFromSearchParams?: string
  tokenImportDialogProps: UseDialogProps
  closeWithResetTokenImportDialog: () => void
}

export function WidgetTransferPanel({
  moveFundsButtonOnClick,
  isTokenAlreadyImported,
  tokenFromSearchParams,
  tokenImportDialogProps,
  closeWithResetTokenImportDialog
}: WidgetTransferPanelProps) {
  const { isConnected } = useAccount()
  const [dialogProps, openDialog] = useDialog2()

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <div className="relative m-auto grid w-max grid-cols-1 gap-4 rounded-lg bg-gray-1 p-4 text-white transition-all duration-300 min-[850px]:grid min-[850px]:max-w-[850px] min-[850px]:grid-cols-2">
        {/* Left/Top panel */}
        <div className="flex h-full max-w-[400px] flex-col gap-1 overflow-hidden">
          <div className="flex flex-row items-center justify-between text-lg">
            <WidgetHeaderAccountButton />

            {/* widget transaction history */}
            <div className="flex flex-row gap-2 text-sm">
              {isConnected && (
                <QueueListIcon
                  className="h-4 w-4 cursor-pointer text-gray-400 hover:text-white"
                  onClick={() => openDialog('widget_transaction_history')}
                />
              )}
            </div>
          </div>
          <TransferPanelMain />
        </div>

        {/* Right/Bottom panel */}
        <div className="flex h-full max-w-[400px] flex-col gap-1 min-[850px]:justify-between">
          <div className="flex flex-col gap-1">
            <div className="h-[30px] text-lg">Receive</div>
            <WidgetRoutes />
          </div>

          <div className="flex flex-col gap-2">
            <WidgetTosConfirmationCheckbox />
            {isConnected ? (
              <MoveFundsButton onClick={moveFundsButtonOnClick} />
            ) : (
              <ConnectWalletButton />
            )}
          </div>
        </div>
      </div>

      {isTokenAlreadyImported === false && tokenFromSearchParams && (
        <TokenImportDialog
          {...tokenImportDialogProps}
          onClose={closeWithResetTokenImportDialog}
          tokenAddress={tokenFromSearchParams}
        />
      )}
    </>
  )
}
