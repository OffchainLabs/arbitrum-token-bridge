import { Dialog as HeadlessUIDialog, Transition } from '@headlessui/react'
import { Fragment, useCallback, useRef, useState } from 'react'

import { Button, ButtonProps } from './Button'
import { getTransitionProps } from './Transition'
import CloseIcon from 'src/assets/close.svg'

/**
 * Returns a promise which resolves to a boolean value, `false` if the action was canceled and `true` if it was confirmed.
 */
type WaitForInputFunction = () => Promise<boolean>

/**
 * Opens the dialog and returns a function which can be called to retreive a {@link WaitForInputFunction}.
 */
type OpenDialogFunction = () => WaitForInputFunction

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

export function useDialog(): UseDialogResult {
  const resolveRef = useRef<(value: boolean | PromiseLike<boolean>) => void>()

  // Whether the dialog is currently open
  const [isOpen, setIsOpen] = useState(false)
  // Whether the dialog was ever open
  const [didOpen, setDidOpen] = useState(false)

  const openDialog: OpenDialogFunction = useCallback(() => {
    setIsOpen(true)
    setDidOpen(true)

    return () => {
      return new Promise(resolve => {
        resolveRef.current = resolve
      })
    }
  }, [])

  const closeDialog = useCallback((confirmed: boolean) => {
    if (typeof resolveRef.current !== 'undefined') {
      resolveRef.current(confirmed)
    }

    setIsOpen(false)
  }, [])

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
  onClose: (confirmed: boolean) => void
  children?: React.ReactNode
}

export function Dialog(props: DialogProps) {
  const isCustom = props.isCustom || false
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
        className="fixed inset-0 z-50 flex md:items-center md:justify-center md:bg-[rgba(0,0,0,0.6)]"
      >
        <div className="z-10 max-h-screen w-full overflow-y-auto bg-white md:max-h-[calc(100vh-80px)] md:w-auto md:rounded-xl md:shadow-[0px_4px_12px_#acacac]">
          {isCustom ? (
            props.children
          ) : (
            <>
              <div className="relative px-8 py-4">
                <HeadlessUIDialog.Title className="text-2xl font-medium">
                  {props.title}
                </HeadlessUIDialog.Title>
                {props.closeable && (
                  <button
                    type="button"
                    className="absolute top-5 right-10"
                    onClick={() => props.onClose(false)}
                  >
                    <img
                      src={CloseIcon}
                      className="h-5 w-5 hover:opacity-70"
                    />
                  </button>
                )}
              </div>

              <div className="flex-grow px-8 py-4">{props.children}</div>

              <div className="flex flex-row justify-end space-x-2 px-8 py-3 md:rounded-bl-xl md:rounded-br-xl md:bg-gray-2">
                <Button
                  ref={cancelButtonRef}
                  variant="secondary"
                  onClick={() => props.onClose(false)}
                  {...(props.cancelButtonProps || {})}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => props.onClose(true)}
                  {...(props.actionButtonProps || {})}
                >
                  {props.actionButtonTitle || 'Continue'}
                </Button>
              </div>
            </>
          )}
        </div>
      </HeadlessUIDialog>
    </Transition>
  )
}
