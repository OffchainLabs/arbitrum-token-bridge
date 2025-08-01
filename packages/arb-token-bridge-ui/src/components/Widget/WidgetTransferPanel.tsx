import { useAccount } from 'wagmi'
import Image from 'next/image'
import { Cog8ToothIcon } from '@heroicons/react/24/outline'
import {
  DialogProps,
  DialogWrapper,
  OpenDialogFunction
} from '../common/Dialog2'
import { WidgetHeaderAccountButton } from './WidgetHeaderAccountButton'
import { WidgetRoutes } from './WidgetRoutes'
import { MoveFundsButton } from '../TransferPanel/MoveFundsButton'
import { WidgetConnectWalletButton } from './WidgetConnectWalletButton'
import { TransferPanelMain } from '../TransferPanel/TransferPanelMain'
import { TokenImportDialog } from '../TransferPanel/TokenImportDialog'
import { ToSConfirmationCheckbox } from '../TransferPanel/ToSConfirmationCheckbox'
import { UseDialogProps } from '../common/Dialog'
import WidgetTxHistoryIcon from '@/images/WidgetTxHistoryIcon.svg'

type WidgetTransferPanelProps = {
  moveFundsButtonOnClick: () => void
  isTokenAlreadyImported?: boolean
  tokenFromSearchParams?: string
  tokenImportDialogProps: UseDialogProps
  openDialog: OpenDialogFunction
  dialogProps: DialogProps
  showSettingsButton: boolean
  closeWithResetTokenImportDialog: () => void
}

export function WidgetTransferPanel({
  dialogProps,
  openDialog,
  moveFundsButtonOnClick,
  isTokenAlreadyImported,
  tokenFromSearchParams,
  tokenImportDialogProps,
  showSettingsButton,
  closeWithResetTokenImportDialog
}: WidgetTransferPanelProps) {
  const { isConnected } = useAccount()

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <div className="relative m-auto grid w-full grid-cols-1 gap-4 rounded-lg bg-transparent p-4 text-white transition-all duration-300 min-[850px]:grid min-[850px]:grid-cols-2">
        {/* Left/Top panel */}
        <div className="flex h-full flex-col gap-1 overflow-hidden">
          <div className="mb-2 flex h-[30px] flex-row items-center justify-between text-lg">
            <WidgetHeaderAccountButton />

            <div className="flex flex-row gap-2 text-sm">
              {/* widget transaction history */}
              {isConnected && (
                <button
                  className="arb-hover text-white"
                  onClick={() => openDialog('widget_transaction_history')}
                >
                  <Image
                    height={20}
                    width={20}
                    alt="Tx history logo"
                    src={WidgetTxHistoryIcon}
                  />
                </button>
              )}

              {/* slippage and advanced settings */}
              {showSettingsButton && (
                <button
                  onClick={() => openDialog('settings')}
                  aria-label="Open Settings"
                >
                  <Cog8ToothIcon
                    width={20}
                    className="arb-hover text-white/80"
                  />
                </button>
              )}
            </div>
          </div>
          <TransferPanelMain />
        </div>

        {/* Right/Bottom panel */}
        <div className="flex h-full flex-col gap-1 min-[850px]:justify-between">
          <div className="flex flex-col gap-1">
            <div className="mb-2 h-[30px] text-lg">Receive</div>
            <WidgetRoutes />
          </div>

          <div className="sticky bottom-4 flex flex-col gap-2 bg-widget-background pt-2">
            <ToSConfirmationCheckbox />

            {isConnected ? (
              <MoveFundsButton onClick={moveFundsButtonOnClick} />
            ) : (
              <WidgetConnectWalletButton />
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
