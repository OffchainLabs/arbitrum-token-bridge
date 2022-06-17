import React, { Fragment } from 'react'

import { Dialog, Transition } from '@headlessui/react'
import { ExclamationIcon } from '@heroicons/react/outline'
import { useRouteMatch } from 'react-router-dom'

const DisclaimerModal = ({
  setTosAccepted,
  tosAccepted,
  prevTosAccepted
}: {
  tosAccepted: boolean
  prevTosAccepted: boolean
  setTosAccepted: (value: string) => void
}) => {
  const isTosRoute = useRouteMatch('/tos')

  const closeBanner = () => {
    setTosAccepted('true')
  }

  if (tosAccepted || isTosRoute) {
    return null
  }

  const tosText =
    prevTosAccepted && !tosAccepted
      ? 'Updated Terms of Service'
      : 'Terms of Service'

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
        <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
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
            <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 sm:align-middle">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <ExclamationIcon
                    className="h-6 w-6 text-green-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {tosText}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm leading-6 text-gray-500">
                      By clicking "I agree" button, you are accepting our{' '}
                      <a
                        href="/tos"
                        target="_blank"
                        className="text-bright-blue hover:underline"
                      >
                        {tosText}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="focus:outline-none inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
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
