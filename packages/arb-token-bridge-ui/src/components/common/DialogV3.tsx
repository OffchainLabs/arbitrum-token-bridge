import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useCallback, useRef, useState } from 'react'

import { transitionDefaultProps } from './Transition'

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
export type UseDialogProps = Pick<DialogV3Props, 'isOpen' | 'onClose'>

/**
 * Returns an array containing {@link UseDialogProps} and {@link OpenDialogFunction}.
 */
export type UseDialogResult = [UseDialogProps, OpenDialogFunction]

export function useDialog(): UseDialogResult {
  const [isOpen, setIsOpen] = useState(false)
  const resolveRef = useRef<(value: boolean | PromiseLike<boolean>) => void>()

  const openDialog: OpenDialogFunction = useCallback(() => {
    setIsOpen(true)

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

  return [{ isOpen, onClose: closeDialog }, openDialog]
}

export type DialogV3Props = {
  isOpen: boolean
  title: string
  actionButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
  actionButtonTitle: string
  onClose: (confirmed: boolean) => void
  children?: React.ReactNode
}

const buttonClassName = 'rounded-lg px-4 py-3 text-sm text-white arb-hover'

export function DialogV3(props: DialogV3Props) {
  const cancelButtonRef = useRef(null)

  return (
    <Transition
      appear
      show={props.isOpen}
      as={Fragment}
      {...transitionDefaultProps}
    >
      <Dialog
        static
        as="div"
        open={props.isOpen}
        initialFocus={cancelButtonRef}
        onClose={() => props.onClose(false)}
        className="bg-v4-dark lg:bg-dialog fixed inset-0 z-50 flex lg:items-center lg:justify-center"
      >
        <div className="shadow-dialog z-10 w-full bg-white lg:w-auto lg:rounded-xl">
          <div className="px-8 py-4">
            <h3 className="text-2xl font-medium">{props.title}</h3>
          </div>
          <div className="flex-grow px-8 py-4">{props.children}</div>
          <div className="flex flex-row justify-end px-8 py-3 lg:rounded-bl-xl lg:rounded-br-xl lg:bg-v3-gray-2">
            <button
              ref={cancelButtonRef}
              onClick={() => props.onClose(false)}
              className={`${buttonClassName} text-v3-dark`}
            >
              Cancel
            </button>
            <button
              {...(props.actionButtonProps || {})}
              onClick={() => props.onClose(true)}
              className={`${buttonClassName} bg-v3-dark disabled:bg-v3-gray-5`}
            >
              {props.actionButtonTitle}
            </button>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
