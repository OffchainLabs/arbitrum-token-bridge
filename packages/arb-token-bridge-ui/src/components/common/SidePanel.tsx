import { Fragment, useState } from 'react'
import { Dialog } from '@headlessui/react'
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
}

export const SidePanel = ({
  isOpen,
  heading,
  onClose,
  children,
  panelClassNameOverrides = '',
  scrollable = true
}: SidePanelProps) => {
  const [isClosing, setIsClosing] = useState(false)

  function handleCloseStart() {
    setIsClosing(true)
  }

  function handleCloseEnd() {
    onClose?.()

    // prevent flickering caused by race conditions
    setTimeout(() => {
      setIsClosing(false)
    }, 0)
  }

  return (
    <Transition show={isOpen && !isClosing} as={Fragment}>
      <Dialog
        open={isOpen}
        onClose={handleCloseStart}
        className="fixed z-40 h-screen max-h-screen"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-[400ms]"
          enterFrom="opacity-0"
          enterTo="opacity-80"
          leave="ease-in duration-300"
          leaveFrom="opacity-80"
          leaveTo="opacity-0"
        >
          {/* The backdrop, rendered as a fixed sibling to the panel container */}
          <div className="fixed inset-0 bg-dark" aria-hidden="true" />
        </Transition.Child>

        {/* Full-screen container to center the panel */}
        <div className="fixed inset-0 right-0 top-0 flex h-full w-full items-start justify-end">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-[400ms]"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="ease-in duration-300"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
            afterLeave={handleCloseEnd}
          >
            {/* The heading of dialog  */}
            <Dialog.Panel
              className={twMerge(
                'side-panel flex h-full w-screen max-w-[1000px] flex-col bg-black',
                panelClassNameOverrides,
                !scrollable ? '' : 'overflow-y-auto'
              )}
            >
              <Dialog.Title
                className={twMerge(
                  'sticky top-0 z-50 mx-4 flex flex-row justify-between bg-black py-4 text-white',
                  heading ? 'border-b-[1px] border-gray-6' : ''
                )}
              >
                {heading && <span className="text-xl">{heading}</span>}
                <button className="arb-hover" onClick={handleCloseStart}>
                  <XMarkIcon
                    className={twMerge(
                      'h-5 w-5 text-white',
                      heading ? '' : 'ml-2'
                    )}
                  />
                </button>
              </Dialog.Title>

              {/* Contents of the panel */}
              <div
                className={twMerge(
                  'side-panel-content z-40 h-full',
                  heading ? 'p-4' : 'px-4 pb-4'
                )}
              >
                {children}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
