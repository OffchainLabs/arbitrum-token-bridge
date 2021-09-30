import React, { Fragment } from 'react'

import { Dialog, Transition } from '@headlessui/react'
import { ExclamationIcon } from '@heroicons/react/outline'
import { useRouteMatch } from 'react-router-dom'

const DisclaimerModal = ({
  setTosAccepted,
  tosAccepted
}: {
  tosAccepted: boolean
  setTosAccepted: (value: string) => void
}) => {
  const isTosRoute = useRouteMatch('/tos')

  const closeBanner = () => {
    setTosAccepted('true')
  }

  if (tosAccepted || isTosRoute) {
    return null
  }

  return (
    <Transition.Root show as={Fragment}>
      <Dialog
        as="div"
        static
        className="fixed inset-0 overflow-y-auto"
        style={{ zIndex: 1000 }}
        open
        onClose={() => {}}
      >
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
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
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
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
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <ExclamationIcon
                    className="h-6 w-6 text-green-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-medium text-gray-900"
                  >
                    Terms of Service
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 leading-6">
                      By clicking "I agree" button, you are accepting our{' '}
                      <a
                        href="/tos"
                        target="_blank"
                        className="text-bright-blue hover:underline"
                      >
                        Terms of Service
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  onClick={closeBanner}
                >
                  I agree
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export { DisclaimerModal }
