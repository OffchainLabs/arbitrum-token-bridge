import { Dialog as HeadlessUIDialog, Transition } from '@headlessui/react'
import { Fragment, useCallback, useRef, useState } from 'react'

import { Button } from './Button'
import { getTransitionProps } from './Transition'

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
  title?: string
  actionButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
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
        initialFocus={cancelButtonRef}
        onClose={() => props.onClose(false)}
        className="bg-v4-dark lg:bg-dialog fixed inset-0 z-50 flex lg:items-center lg:justify-center"
      >
        <div className="lg:shadow-dialog lg:max-h-screen-minus-100px z-10 max-h-screen w-full overflow-y-scroll bg-white lg:w-auto lg:rounded-xl">
          {isCustom ? (
            props.children
          ) : (
            <>
              <div className="px-8 py-4">
                <h3 className="text-2xl font-medium">{props.title}</h3>
              </div>

              <div className="flex-grow px-8 py-4">{props.children}</div>

              <div className="flex flex-row justify-end space-x-2 px-8 py-3 lg:rounded-bl-xl lg:rounded-br-xl lg:bg-v3-gray-2">
                <Button
                  ref={cancelButtonRef}
                  variant="secondary"
                  onClick={() => props.onClose(false)}
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
