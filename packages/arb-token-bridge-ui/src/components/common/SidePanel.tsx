import { Fragment, useCallback, useEffect, useState } from 'react'
import { Dialog, DialogBackdrop } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Transition } from '@headlessui/react'

type SidePanelProps = {
  heading?: string
  isOpen: boolean
  onClose?: () => void
  children: React.ReactNode
  panelClassNameOverrides?: string
  scrollable?: boolean
  dialogWrapperClassName?: string
}

export const SidePanel = ({
  isOpen,
  heading,
  onClose,
  children,
  panelClassNameOverrides = '',
  scrollable = true,
  dialogWrapperClassName
}: SidePanelProps) => {
  const [open, setOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // When user refreshes the page with the panel open, the query param starts as true
  // For the transition to trigger we need to start from false, that's why we need another state
  // Otherwise it also causes the backdrop to have no opacity so it looks quite bad
  useEffect(() => {
    setOpen(isOpen)
  }, [isOpen])

  const handleCloseStart = useCallback(() => {
    setIsClosing(true)
  }, [setIsClosing])

  const handleCloseEnd = useCallback(() => {
    onClose?.()

    // prevent flickering caused by race conditions
    setTimeout(() => {
      setIsClosing(false)
    }, 10)
  }, [onClose, setIsClosing])

  return (
    <Dialog
      open={open}
      onClose={handleCloseStart}
      className={twMerge(
        'fixed z-40 h-screen max-h-screen',
        dialogWrapperClassName
      )}
    >
      <Transition show={open && !isClosing} as={Fragment}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-80"
          leave="ease-in duration-200"
          leaveFrom="opacity-80"
          leaveTo="opacity-0"
        >
          <DialogBackdrop
            className="fixed inset-0 bg-dark opacity-80"
            aria-hidden="true"
          />
        </Transition.Child>

        <div className="fixed inset-0 right-0 top-0 flex h-full w-full items-start justify-end">
          {/* Full-screen container to center the panel */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
            afterLeave={handleCloseEnd}
          >
            {/* The heading of dialog  */}
            <Dialog.Panel
              className={twMerge(
                'side-panel flex h-full w-screen max-w-[1000px] flex-col border-l border-gray-dark bg-black',
                panelClassNameOverrides,
                scrollable && 'overflow-y-auto'
              )}
            >
              <Dialog.Title
                className={twMerge(
                  'sticky top-0 z-50 mx-4 flex flex-row justify-between bg-black pt-4 text-white',
                  !heading && 'pb-4'
                )}
              >
                {heading && <span className="text-2xl">{heading}</span>}
                <button
                  className="arb-hover"
                  onClick={handleCloseStart}
                  aria-label="Close side panel"
                >
                  <XMarkIcon
                    className={twMerge(
                      'h-5 w-5 text-white',
                      !heading && 'ml-2'
                    )}
                  />
                </button>
              </Dialog.Title>

              {/* Contents of the panel */}
              <div
                className={twMerge(
                  'side-panel-content z-40 h-full px-4 pb-4',
                  heading && 'p-4'
                )}
              >
                {children}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Transition>
    </Dialog>
  )
}
