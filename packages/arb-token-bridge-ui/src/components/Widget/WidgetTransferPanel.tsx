import { useAccount } from 'wagmi'
import Image from 'next/image'
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
import { Button } from '../common/Button'
import { LifiSettingsButton } from '../TransferPanel/LifiSettingsButton'
import { ReceiveFundsHeader } from '../TransferPanel/ReceiveFundsHeader'
import { ChevronDownIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

type WidgetTransferPanelProps = {
  moveFundsButtonOnClick: () => void
  isTokenAlreadyImported?: boolean
  tokenFromSearchParams?: string
  tokenImportDialogProps: UseDialogProps
  openDialog: OpenDialogFunction
  dialogProps: DialogProps
  closeWithResetTokenImportDialog: () => void
}

export function WidgetTransferPanel({
  dialogProps,
  openDialog,
  moveFundsButtonOnClick,
  isTokenAlreadyImported,
  tokenFromSearchParams,
  tokenImportDialogProps,
  closeWithResetTokenImportDialog
}: WidgetTransferPanelProps) {
  const { isConnected } = useAccount()

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <div className="relative m-auto grid w-full grid-cols-1 gap-4 rounded-lg bg-transparent p-4 text-white transition-all duration-300 min-[850px]:grid min-[850px]:grid-cols-2">
        {/* Left/Top panel */}
        <div className="flex h-full flex-col gap-1 overflow-hidden">
          <div className="mb-2 flex h-[40px] flex-row items-center justify-between text-lg">
            <Button
              variant="secondary"
              className="h-[40px] px-[10px] py-[10px] text-white disabled:bg-transparent disabled:text-white disabled:opacity-100"
              disabled
            >
              <div className="flex items-center gap-2">
                <PaperAirplaneIcon className="h-3 w-3" />
                Bridge
                <ChevronDownIcon className="h-3 w-3 opacity-30" />
              </div>
            </Button>

            <div className="flex flex-row gap-2 text-sm">
              <WidgetHeaderAccountButton />

              {/* widget transaction history */}
              {isConnected && (
                <Button
                  variant="secondary"
                  className="h-[40px] px-[10px] py-[10px] text-white"
                  onClick={() => openDialog('widget_transaction_history')}
                >
                  <Image
                    height={18}
                    width={18}
                    alt="Tx history logo"
                    src={WidgetTxHistoryIcon}
                  />
                </Button>
              )}

              <LifiSettingsButton />
            </div>
          </div>
          <TransferPanelMain />
        </div>

        {/* Right/Bottom panel */}
        <div className="flex h-full flex-col gap-1 rounded-lg min-[850px]:justify-between min-[850px]:bg-white/5 min-[850px]:p-4">
          <div className="flex flex-col gap-4">
            <ReceiveFundsHeader />

            <WidgetRoutes />
          </div>

          <div className="flex flex-col gap-2 pt-2">
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
