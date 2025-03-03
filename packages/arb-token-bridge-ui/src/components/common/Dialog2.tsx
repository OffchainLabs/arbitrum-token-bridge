import { useCallback, useEffect, useRef, useState } from 'react'

import { TokenApprovalDialog } from '../TransferPanel/TokenApprovalDialog'
import { useIsOftV2Transfer } from '../TransferPanel/hooks/useIsOftV2Transfer'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useIsCctpTransfer } from '../TransferPanel/hooks/useIsCctpTransfer'
import { WithdrawalConfirmationDialog } from '../TransferPanel/WithdrawalConfirmationDialog'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { USDCWithdrawalConfirmationDialog } from '../TransferPanel/USDCWithdrawal/USDCWithdrawalConfirmationDialog'
import { USDCDepositConfirmationDialog } from '../TransferPanel/USDCDeposit/USDCDepositConfirmationDialog'
/**
 * Returns a promise which resolves to an array [boolean, unknown] value,
 * `false` if the action was canceled and `true` if it was confirmed.
 * Second index contain any additional information
 */
type WaitForInputFunction = () => Promise<[boolean, unknown]>

/**
 * Opens the dialog and returns a function which can be called to retreive a {@link WaitForInputFunction}.
 */
type OpenDialogFunction = (dialogType: DialogType) => WaitForInputFunction

/**
 * Returns an array containing {@link DialogProps} and {@link OpenDialogFunction}.
 */
type UseDialogResult = [DialogProps, OpenDialogFunction]

type DialogType =
  | 'approve_token'
  | 'withdraw'
  | 'withdraw_usdc'
  | 'deposit_usdc'

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
  const isCctp = useIsCctpTransfer()
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
      return (
        <TokenApprovalDialog
          {...commonProps}
          token={selectedToken}
          isCctp={isCctp}
          isOft={isOftTransfer}
        />
      )
    case 'withdraw':
      return <WithdrawalConfirmationDialog {...commonProps} amount={amount} />
    case 'withdraw_usdc':
      return (
        <USDCWithdrawalConfirmationDialog {...commonProps} amount={amount} />
      )
    case 'deposit_usdc':
      return <USDCDepositConfirmationDialog {...commonProps} amount={amount} />
    default:
      return null
  }
}
