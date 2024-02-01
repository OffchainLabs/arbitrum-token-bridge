import { Dialog as HeadlessUIDialog, Transition } from '@headlessui/react'
import { Fragment, useCallback, useRef, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

import { Button, ButtonProps } from './Button'
import { getTransitionProps } from './Transition'
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
  isCustom?: boolean
  closeable?: boolean
  title?: string | JSX.Element
  initialFocus?: React.MutableRefObject<HTMLElement | null>
  cancelButtonProps?: Partial<ButtonProps>
  actionButtonProps?: Partial<ButtonProps>
  actionButtonTitle?: string
  onClose: (confirmed: boolean, onCloseData?: unknown) => void
  className?: string
  children?: React.ReactNode
}

export function Dialog(props: DialogProps) {
  const isCustom = props.isCustom || false
  const closeable = props.closeable || true
  const className = props.className || ''
  const cancelButtonRef = useRef(null)

  return (
    <Transition
      appear
      show={props.isOpen}
      as={Fragment}
      {...getTransitionProps('normal')}
    >
      <HeadlessUIDialog
        static
        as="div"
        open={props.isOpen}
        initialFocus={props.initialFocus || cancelButtonRef}
        onClose={() => props.onClose(false)}
        className="fixed inset-0 z-50 flex text-white md:items-center md:justify-center"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-80"
          leave="ease-in duration-300"
          leaveFrom="opacity-80"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black" aria-hidden="true" />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <HeadlessUIDialog.Panel
            className={twMerge(
              'z-10 max-h-screen w-full overflow-y-auto border border-gray-dark bg-gray-1 md:w-auto md:rounded',
              className
            )}
          >
            {isCustom ? (
              props.children
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-5 pt-3">
                  <HeadlessUIDialog.Title className="text-xl">
                    {props.title}
                  </HeadlessUIDialog.Title>
                  {closeable && (
                    <button type="button" onClick={() => props.onClose(false)}>
                      <XMarkIcon className="arb-hover h-5 w-5 text-white" />
                    </button>
                  )}
                </div>

                <div className="mb-4 flex-grow px-5">{props.children}</div>

                <div className="flex flex-row justify-end space-x-2 bg-white/20 px-5 py-2 md:rounded-bl md:rounded-br">
                  <Button
                    ref={cancelButtonRef}
                    variant="secondary"
                    onClick={() => props.onClose(false)}
                    aria-label="Dialog Cancel"
                    className="text-white"
                    {...(props.cancelButtonProps || {})}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => props.onClose(true)}
                    {...(props.actionButtonProps || {})}
                    aria-label={props.actionButtonTitle || 'Dialog Continue'}
                  >
                    {props.actionButtonTitle || 'Continue'}
                  </Button>
                </div>
              </>
            )}
          </HeadlessUIDialog.Panel>
        </Transition.Child>
      </HeadlessUIDialog>
    </Transition>
  )
}
