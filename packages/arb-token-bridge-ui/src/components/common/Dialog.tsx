import { Dialog as HeadlessUIDialog, DialogBackdrop } from '@headlessui/react'
import { useCallback, useRef, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

import { Button, ButtonProps } from './Button'
/**
 * Returns a promise which resolves to an array [boolean, unknown] value,
 * `false` if the action was canceled and `true` if it was confirmed.
 * Second index contain any additional information
 */
type WaitForInputFunction = () => Promise<[boolean, unknown]>

/**
 * Opens the dialog and returns a function which can be called to retreive a {@link WaitForInputFunction}.
 */
export type OpenDialogFunction = () => WaitForInputFunction

/**
 * Contains two props, `isOpen` and `onClose`, which should be passed down to a Dialog component.
 */
export type UseDialogProps = Pick<DialogProps, 'isOpen' | 'onClose'>

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

export function useDialog(params?: UseDialogParams): UseDialogResult {
  const resolveRef = useRef<
    (value: [boolean, unknown] | PromiseLike<[boolean, unknown]>) => void
  >(() => {})

  // Whether the dialog is currently open
  const [isOpen, setIsOpen] = useState(params?.defaultIsOpen ?? false)
  // Whether the dialog was ever open
  const [didOpen, setDidOpen] = useState(params?.defaultIsOpen ?? false)

  const openDialog: OpenDialogFunction = useCallback(() => {
    setIsOpen(true)
    setDidOpen(true)

    return () => {
      return new Promise(resolve => {
        resolveRef.current = resolve
      })
    }
  }, [])

  const closeDialog = useCallback(
    (confirmed: boolean, onCloseData?: unknown) => {
      if (typeof resolveRef.current !== 'undefined') {
        resolveRef.current([confirmed, onCloseData])
      }

      setIsOpen(false)
    },
    []
  )

  return [{ isOpen, onClose: closeDialog }, openDialog, { didOpen }]
}

export type DialogProps = {
  isOpen: boolean
  closeable?: boolean
  title?: React.ReactNode
  initialFocus?: React.MutableRefObject<HTMLElement | null>
  cancelButtonProps?: Partial<ButtonProps>
  actionButtonProps?: Partial<ButtonProps>
  actionButtonTitle?: string
  isFooterHidden?: boolean
  onClose: (confirmed: boolean, onCloseData?: unknown) => void
  className?: string
  children?: React.ReactNode
}

export function Dialog(props: DialogProps) {
  const isFooterHidden = props.isFooterHidden || false
  const closeable = props.closeable ?? true
  const className = props.className || ''
  const cancelButtonRef = useRef(null)
  const onClose = props.onClose

  // separate state to track transition state and have a smooth exit animation
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = useCallback(
    (confirmed: boolean) => {
      if (!confirmed && !closeable) {
        return
      }

      setIsClosing(true)

      setTimeout(() => {
        onClose(confirmed)

        // prevent flickering caused by race conditions
        setTimeout(() => {
          setIsClosing(false)
        }, 10)

        // 200ms for the transition to finish
      }, 200)
    },
    [closeable, onClose]
  )

  return (
    <HeadlessUIDialog
      as="div"
      open={props.isOpen && !isClosing}
      onClose={() => handleClose(false)}
      transition
      className="fixed inset-0 z-50 flex text-white md:items-center md:justify-center"
    >
      <DialogBackdrop
        transition
        className={twMerge(
          'fixed inset-0 bg-black opacity-80 transition-opacity',
          'data-[closed]:opacity-0 data-[enter]:duration-400 data-[enter]:ease-out',
          'data-[leave]:duration-200 data-[leave]:ease-in'
        )}
        aria-hidden="true"
      />
      <HeadlessUIDialog.Panel
        transition
        className={twMerge(
          'z-10 max-h-screen w-screen scale-100 overflow-y-auto border border-gray-dark bg-gray-1 opacity-100 transition-[transform_opacity] md:max-w-[727px] md:rounded',
          'data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-400 data-[enter]:ease-out',
          'data-[leave]:duration-200 data-[leave]:ease-in',
          className
        )}
      >
        <div className="flex items-start justify-between px-6 pt-4">
          <HeadlessUIDialog.Title className="text-xl text-gray-2">
            {props.title}
          </HeadlessUIDialog.Title>
          {closeable && (
            <button type="button" onClick={() => handleClose(false)}>
              <XMarkIcon className="arb-hover h-6 w-6 text-gray-7" />
            </button>
          )}
        </div>

        <div className="flex-grow px-6">{props.children}</div>

        {!isFooterHidden && (
          <div className="flex flex-row justify-end space-x-2 bg-[#3B3B3B] px-6 py-2">
            {closeable && (
              <Button
                ref={cancelButtonRef}
                variant="tertiary"
                onClick={() => handleClose(false)}
                aria-label="Dialog Cancel"
                className="text-white"
                {...(props.cancelButtonProps || {})}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => handleClose(true)}
              {...(props.actionButtonProps || {})}
              aria-label={props.actionButtonTitle || 'Dialog Continue'}
            >
              {props.actionButtonTitle || 'Continue'}
            </Button>
          </div>
        )}
      </HeadlessUIDialog.Panel>
    </HeadlessUIDialog>
  )
}
