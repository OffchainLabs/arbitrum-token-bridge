import React, { Fragment, useRef } from 'react'

import { Dialog, Transition } from '@headlessui/react'
import Loader from 'react-loader-spinner'

import { useAppState } from '../../state'
import { ConnectionState } from '../../util'

const LoadingIndicator = (): JSX.Element => (
  <div className="flex items-center justify-center mx-auto">
    <Loader type="Oval" color="#fff" height={42} width={42} />
  </div>
)

const MessageOverlayContent = (): JSX.Element => {
  const {
    app: { connectionState }
  } = useAppState()

  if (
    connectionState === ConnectionState.LOADING
    // ||
    // verifying === WhiteListState.VERIFYING
  ) {
    return <LoadingIndicator />
  }

  // // not needed for the Mainnet release, probably safe to just delete
  // if (
  //   connectionState !== ConnectionState.LOADING &&
  //   verifying === WhiteListState.DISALLOWED
  // ) {
  //   return (
  //     <div className="flex justify-center shadow-xl">
  //       <Alert type="red">
  //         Stop! You are attempting to use Mainnet Beta with unapproved address{' '}
  //         {arbTokenBridge.walletAddress}! <br /> Switch to an approved address
  //         or connect to Rinkeby for our public testnet.
  //       </Alert>
  //     </div>
  //   )
  // }
  return <div></div>
}

const MessageOverlay = (): JSX.Element => {
  const {
    app: { connectionState, arbTokenBridgeLoaded }
  } = useAppState()
  const focusRef = useRef(null)

  if (
    !arbTokenBridgeLoaded ||
    connectionState === ConnectionState.LOADING
    // ||
    // verifying === WhiteListState.VERIFYING ||
    // verifying === WhiteListState.DISALLOWED
  ) {
    return (
      <Transition.Root show as={Fragment}>
        <Dialog
          as="div"
          auto-reopen="true"
          className="fixed z-10 inset-0 overflow-y-auto"
          onClose={() => {}}
          initialFocus={focusRef}
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
              <div className="inline-block align-bottom bg-transparent rounded-lg text-left overflow-hidden  transform transition-all sm:align-middle   ">
                <MessageOverlayContent />
                <div ref={focusRef} />
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    )
  }

  return <></>
}

export default MessageOverlay
