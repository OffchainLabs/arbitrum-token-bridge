import React, { Fragment } from 'react'

import { Dialog, Transition } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline'
import { Link } from 'react-router-dom'

interface ModalProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  buttonText?: string
  buttonAction?: () => void
  buttonHref?: string
  wide?: boolean
  title?: JSX.Element | string
  hideButton?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const CloseModalContext = React.createContext(() => {})

const Modal: React.FC<ModalProps> = ({
  title,
  isOpen,
  setIsOpen,
  buttonText,
  buttonAction,
  buttonHref,
  wide,
  hideButton,
  children
}) => {
  return (
    <CloseModalContext.Provider value={() => setIsOpen(false)}>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          static
          className="fixed inset-0 z-10 overflow-y-auto"
          open={isOpen}
          onClose={setIsOpen}
        >
          <div className="flex min-h-screen items-center justify-center px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="hidden sm:inline-block sm:h-screen sm:align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div
                className={`inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:p-6 sm:align-middle ${
                  wide ? 'sm:max-w-screen-xl' : 'sm:max-w-screen-md'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-lg font-bold">{title}</div>
                  <div className="block">
                    <button
                      type="button"
                      className="focus:outline-none rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="sr-only">Close</span>
                      <XIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {!hideButton && (
                  <div className="mt-5 sm:mt-6">
                    {buttonAction && (
                      <button
                        type="button"
                        className="focus:outline-none mb-1 inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm  focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
                        onClick={e => {
                          buttonAction()
                        }}
                      >
                        {buttonText}
                      </button>
                    )}
                    {buttonHref && (
                      <Link
                        to={buttonHref}
                        className="focus:outline-none inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm  focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
                      >
                        {buttonText}
                      </Link>
                    )}
                  </div>
                )}

                <div>{children}</div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </CloseModalContext.Provider>
  )
}

export { Modal }
