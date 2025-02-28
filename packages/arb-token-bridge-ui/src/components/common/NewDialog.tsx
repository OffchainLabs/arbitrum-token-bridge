import { useCallback, useEffect, useRef, useState } from 'react'

import { TokenApprovalDialog } from '../TransferPanel/TokenApprovalDialog'
import { useIsOftV2Transfer } from '../TransferPanel/hooks/useIsOftV2Transfer'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useIsCctpTransfer } from '../TransferPanel/hooks/useIsCctpTransfer'
import { WithdrawalConfirmationDialog } from '../TransferPanel/WithdrawalConfirmationDialog'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
/**
 * Returns a promise which resolves to an array [boolean, unknown] value,
 * `false` if the action was canceled and `true` if it was confirmed.
 * Second index contain any additional information
 */
type WaitForInputFunction = () => Promise<[boolean, unknown]>

/**
 * Opens the dialog and returns a function which can be called to retreive a {@link WaitForInputFunction}.
 */
export type OpenDialogFunction = (
  dialogType: DialogType
) => WaitForInputFunction

/**
 * Contains two props, `isOpen` and `onClose`, which should be passed down to a Dialog component.
 */
export type UseDialogProps = Pick<DialogProps, 'openedDialog' | 'onClose'>

/**
 * Returns an array containing {@link UseDialogProps} and {@link OpenDialogFunction}.
 */
export type UseDialogResult = [UseDialogProps, OpenDialogFunction]

type DialogType = 'approve_token' | 'withdrawal_confirmation'

export function useNewDialog(): UseDialogResult {
  const resolveRef =
    useRef<
      (value: [boolean, unknown] | PromiseLike<[boolean, unknown]>) => void
    >()

  // Whether the dialog is currently open
  const [openedDialog, setOpenedDialog] = useState<DialogType | null>(null)

  const openDialog: OpenDialogFunction = useCallback(
    (dialogType: DialogType) => {
      setOpenedDialog(dialogType)

      return () => {
        return new Promise(resolve => {
          resolveRef.current = resolve
        })
      }
    },
    []
  )

  const closeDialog = useCallback(
    (confirmed: boolean, onCloseData?: unknown) => {
      if (typeof resolveRef.current !== 'undefined') {
        resolveRef.current([confirmed, onCloseData])
      }

      setOpenedDialog(null)
    },
    []
  )

  return [{ openedDialog, onClose: closeDialog }, openDialog]
}

type DialogProps = {
  openedDialog: DialogType | null
  onClose: (confirmed: boolean, onCloseData?: unknown) => void
}

export function DialogWrapper(props: DialogProps) {
  const isOftTransfer = useIsOftV2Transfer()
  const [selectedToken] = useSelectedToken()
  const isCctp = useIsCctpTransfer()
  const [{ amount }] = useArbQueryParams()

  const [isOpen, setIsOpen] = useState(false)

  const { openedDialog } = props
  const commonProps: DialogProps & { isOpen: boolean } = { ...props, isOpen }

  // By doing this we enable fade in transition when dialog opens.
  useEffect(() => {
    setIsOpen(openedDialog !== null)
  }, [openedDialog])

  switch (openedDialog) {
    case 'approve_token':
      return (
        <TokenApprovalDialog
          {...commonProps}
          token={selectedToken}
          isCctp={isCctp}
          isOft={isOftTransfer}
        />
      )
    case 'withdrawal_confirmation':
      return <WithdrawalConfirmationDialog {...commonProps} amount={amount} />
    default:
      return null
  }
}
