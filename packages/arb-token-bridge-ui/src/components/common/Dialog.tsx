import { Dialog as HeadlessUIDialog, Transition } from '@headlessui/react'
import { Fragment, useCallback, useRef, useState } from 'react'
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
  const resolveRef =
    useRef<
      (value: [boolean, unknown] | PromiseLike<[boolean, unknown]>) => void
    >()

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
  title?: string | JSX.Element
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

  // separate state to track transition state and have a smooth exit animation
  const [isClosing, setIsClosing] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleCloseStart = useCallback(
    (confirmed: boolean) => {
      if (!confirmed && !closeable) {
        return
      }

      setIsConfirmed(confirmed)
      setIsClosing(true)
    },
    [setIsClosing, setIsConfirmed, closeable]
  )

  const handleCloseEnd = useCallback(() => {
    props.onClose(isConfirmed)
    // prevents race conditions that could cause a flicker of the dialog after close
    setTimeout(() => {
      setIsClosing(false)
    }, 0)
  }, [props, isConfirmed, setIsClosing])

  return (
    <Transition show={props.isOpen && !isClosing} as={Fragment}>
      <HeadlessUIDialog
        as="div"
        open={props.isOpen}
        initialFocus={props.initialFocus || cancelButtonRef}
        onClose={() => handleCloseStart(false)}
        className="fixed inset-0 z-50 flex text-white md:items-center md:justify-center"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-400"
          enterFrom="opacity-0"
          enterTo="opacity-80"
          leave="ease-in duration-200"
          leaveFrom="opacity-80"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black" aria-hidden="true" />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-400"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
          afterLeave={handleCloseEnd}
        >
          <HeadlessUIDialog.Panel
            className={twMerge(
              'z-10 max-h-screen w-screen overflow-y-auto border border-gray-dark bg-gray-1 md:max-w-[727px] md:rounded',
              className
            )}
          >
            <div className="flex items-start justify-between px-6 pt-4">
              <HeadlessUIDialog.Title className="text-xl text-gray-2">
                {props.title}
              </HeadlessUIDialog.Title>
              {closeable && (
                <button type="button" onClick={() => handleCloseStart(false)}>
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
                    onClick={() => handleCloseStart(false)}
                    aria-label="Dialog Cancel"
                    className="text-white"
                    {...(props.cancelButtonProps || {})}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => handleCloseStart(true)}
                  {...(props.actionButtonProps || {})}
                  aria-label={props.actionButtonTitle || 'Dialog Continue'}
                >
                  {props.actionButtonTitle || 'Continue'}
                </Button>
              </div>
            )}
          </HeadlessUIDialog.Panel>
        </Transition.Child>
      </HeadlessUIDialog>
    </Transition>
  )
}
