import { useCallback, useRef, useState } from 'react'

import { ButtonProps } from './Button'
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
 * Contains additional info about the dialog.
 */
export type OtherDialogInfo = { didOpen: boolean }

/**
 * Returns an array containing {@link UseDialogProps} and {@link OpenDialogFunction}.
 */
export type UseDialogResult = [
  UseDialogProps,
  OpenDialogFunction,
  OtherDialogInfo
]

/**
 * Initial parameters for the dialog.
 */
type UseDialogParams = {
  /**
   * Whether the dialog should be open by default.
   */
  defaultIsOpen?: boolean
}

type DialogType = 'approve_token' | 'withdrawal_confirmation'

export function useNewDialog(params?: UseDialogParams): UseDialogResult {
  const resolveRef =
    useRef<
      (value: [boolean, unknown] | PromiseLike<[boolean, unknown]>) => void
    >()

  // Whether the dialog is currently open
  const [openedDialog, setOpenedDialog] = useState<DialogType | null>(null)
  // Whether the dialog was ever open
  const [didOpen, setDidOpen] = useState(params?.defaultIsOpen ?? false)

  const openDialog: OpenDialogFunction = useCallback(
    (dialogType: DialogType) => {
      setOpenedDialog(dialogType)
      setDidOpen(true)

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

  return [{ openedDialog, onClose: closeDialog }, openDialog, { didOpen }]
}

type DialogProps = {
  openedDialog: DialogType | null
  closeable?: boolean
  title?: string | JSX.Element
  initialFocus?: React.MutableRefObject<HTMLElement | null>
  cancelButtonProps?: Partial<ButtonProps>
  actionButtonProps?: Partial<ButtonProps>
  actionButtonTitle?: string
  isFooterHidden?: boolean
  onClose: (confirmed: boolean, onCloseData?: unknown) => void
  className?: string
}

export function DialogWrapper(props: DialogProps) {
  const isOftTransfer = useIsOftV2Transfer()
  const [selectedToken] = useSelectedToken()
  const isCctp = useIsCctpTransfer()
  const [{ amount }] = useArbQueryParams()

  switch (props.openedDialog) {
    case 'approve_token':
      return (
        <TokenApprovalDialog
          {...props}
          isOpen
          token={selectedToken}
          isCctp={isCctp}
          isOft={isOftTransfer}
        />
      )
    case 'withdrawal_confirmation':
      return <WithdrawalConfirmationDialog {...props} isOpen amount={amount} />
    default:
      return null
  }
}
