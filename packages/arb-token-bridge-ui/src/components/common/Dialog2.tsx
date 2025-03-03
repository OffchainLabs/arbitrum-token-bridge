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

type HasParams<T extends DialogType> = T extends keyof DialogTypeParams
  ? true
  : false

type ParamsType<T extends DialogType> = HasParams<T> extends true
  ? T extends keyof DialogTypeParams
    ? DialogTypeParams[T]
    : never
  : Record<string, unknown> | undefined

/**
 * Opens the dialog and returns a function which can be called to retreive a {@link WaitForInputFunction}.
 */
type OpenDialogFunction = <T extends DialogType>(
  dialogType: T,
  ...args: T extends keyof DialogTypeParams
    ? [params: DialogTypeParams[T]]
    : [params?: undefined]
) => WaitForInputFunction

/**
 * Returns an array containing {@link DialogProps} and {@link OpenDialogFunction}.
 */
type UseDialogResult = [DialogProps, OpenDialogFunction]

type DialogType = 'approve_token' | 'withdraw'

// Add additional properties here
type DialogTypeParams = {
  approve_token: { isCctp: boolean }
}

export function useDialog2(): UseDialogResult {
  const resolveRef =
    useRef<
      (value: [boolean, unknown] | PromiseLike<[boolean, unknown]>) => void
    >()

  const [params, setParams] = useState<ParamsType<DialogType>>()

  // Whether the dialog is currently open
  const [openedDialogType, setOpenedDialogType] = useState<DialogType | null>(
    null
  )

  const openDialog: OpenDialogFunction = useCallback(
    <T extends DialogType>(
      dialogType: T,
      ...args: T extends keyof DialogTypeParams
        ? [params: DialogTypeParams[T]]
        : [params?: Record<string, unknown>]
    ) => {
      setOpenedDialogType(dialogType)
      setParams(args[0])

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

  return [{ openedDialogType, onClose: closeDialog, params }, openDialog]
}

type DialogProps<T extends DialogType = DialogType> = {
  openedDialogType: T | null
  onClose: (confirmed: boolean, onCloseData?: unknown) => void
  params: ParamsType<T>
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
      const approveTokenParams = props.params as DialogTypeParams['approve_token']
      return (
        <TokenApprovalDialog
          {...commonProps}
          token={selectedToken}
          isCctp={approveTokenParams.isCctp}
          isOft={isOftTransfer}
        />
      )
    case 'withdraw':
      return <WithdrawalConfirmationDialog {...commonProps} amount={amount} />
    default:
      return null
  }
}
