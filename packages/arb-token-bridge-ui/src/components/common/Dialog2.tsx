import { useCallback, useEffect, useRef, useState } from 'react'

import { TokenApprovalDialog } from '../TransferPanel/TokenApprovalDialog'
import { useIsOftV2Transfer } from '../TransferPanel/hooks/useIsOftV2Transfer'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { WithdrawalConfirmationDialog } from '../TransferPanel/WithdrawalConfirmationDialog'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
/**
 * Returns a promise which resolves to an array [boolean, unknown] value,
 * `false` if the action was canceled and `true` if it was confirmed.
 * Second index contain any additional information
 */
type WaitForInputFunction = () => Promise<[boolean, unknown]>

/**
 * Opens the dialog and returns a function which can be called to retrieve a {@link WaitForInputFunction}.
 */
type OpenDialogFunction = (dialogType: DialogType) => WaitForInputFunction

/**
 * Returns an array containing {@link DialogProps} and {@link OpenDialogFunction}.
 */
type UseDialogResult = [DialogProps, OpenDialogFunction]

type DialogType = 'approve_token' | 'approve_cctp_usdc' | 'withdraw'

export function useDialog2(): UseDialogResult {
  const resolveRef =
    useRef<
      (value: [boolean, unknown] | PromiseLike<[boolean, unknown]>) => void
    >()

  // Whether the dialog is currently open
  const [openedDialogType, setOpenedDialogType] = useState<DialogType | null>(
    null
  )

  const openDialog: OpenDialogFunction = useCallback(
    (dialogType: DialogType) => {
      setOpenedDialogType(dialogType)

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

      setOpenedDialogType(null)
    },
    []
  )

  return [{ openedDialogType, onClose: closeDialog }, openDialog]
}

type DialogProps = {
  openedDialogType: DialogType | null
  onClose: (confirmed: boolean, onCloseData?: unknown) => void
}

export function DialogWrapper(props: DialogProps) {
  const isOftTransfer = useIsOftV2Transfer()
  const [selectedToken] = useSelectedToken()
  const [{ amount }] = useArbQueryParams()

  const [isOpen, setIsOpen] = useState(false)

  const { openedDialogType } = props
  const commonProps: DialogProps & { isOpen: boolean } = { ...props, isOpen }

  // By doing this we enable fade in transition when dialog opens.
  useEffect(() => {
    setIsOpen(openedDialogType !== null)
  }, [openedDialogType])

  switch (openedDialogType) {
    case 'approve_token':
    case 'approve_cctp_usdc':
      return (
        <TokenApprovalDialog
          {...commonProps}
          token={selectedToken}
          isCctp={openedDialogType === 'approve_cctp_usdc'}
          isOft={isOftTransfer}
        />
      )
    case 'withdraw':
      return <WithdrawalConfirmationDialog {...commonProps} amount={amount} />
    default:
      return null
  }
}
