import { Fragment, useMemo, useRef } from 'react'

import { Dialog, Transition } from '@headlessui/react'
import { ExclamationIcon } from '@heroicons/react/outline'

export enum ModalStatus {
  CLOSED,
  DEPOSIT,
  USER_ADDED_DEPOSIT,
  WITHDRAW,
  NEW_TOKEN_DEPOSITING
}

export default function TransactionConfirmationModal({
  status,
  closeModal,
  onConfirm,
  isDepositing,
  symbol,
  amount
}: {
  onConfirm: () => void
  status: ModalStatus
  isDepositing: boolean
  closeModal: () => void
  symbol: string
  amount: string
}) {
  const cancelButtonRef = useRef(null)

  const textContent = useMemo(() => {
    switch (status) {
      case ModalStatus.DEPOSIT:
        return (
          <>
            This transaction will take 10 minutes. <br /> <br />
            NOTE: Withdrawing {symbol} back to Ethereum will take 8 days if your
            token is not supported by a <span> </span>
            <a
              href="https://portal.arbitrum.one/#bridgesandonramps"
              target="_blank"
              rel="noopener noreferrer"
            >
              <u>fast bridge</u>
            </a>
            .<br />
          </>
        )
      case ModalStatus.WITHDRAW:
        return (
          <>
            This transaction will take{' '}
            <span style={{ color: 'red' }}> 8 days</span>. <br />
            <br />
            After the 8 days, return to this bridge to claim your funds on
            Ethereum mainnet (L1).
            <br />
            NOTE: This claim will incur a secondary L1 gas fee.
            <br />
          </>
        )
      case ModalStatus.USER_ADDED_DEPOSIT:
        return (
          <>
            You are about to deposit {symbol} to Arbitrum 🎉 <br />
            <br />
            <span style={{ color: 'red' }}>Do not bridge</span> if your token
            does something non-standard like generates passive interest or is a
            rebasing stablecoin. <br />
            <br />
            Not sure if your token is compatible?
            <ul>
              <li>
                •{' '}
                <a
                  href="https://developer.offchainlabs.com/docs/bridging_assets#the-arbitrum-generic-custom-gateway"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <u>Check the docs</u>
                </a>
              </li>
              <li>
                {' '}
                •{' '}
                <a
                  href="https://discord.gg/ZpZuw7p"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <u>Join Discord and ask</u>
                </a>
              </li>
            </ul>
            <br />
          </>
        )

      case ModalStatus.NEW_TOKEN_DEPOSITING:
        return (
          <>
            You are the first to bridge {symbol} to Arbitrum 🎉 <br />
            <br />
            <b>Important facts</b>
            <ol>
              <li>1. Some tokens are not compatible with the bridge</li>
              <li>
                2. The initial bridge is more expensive than following ones
              </li>
            </ol>
            <br />
            <span style={{ color: 'red' }}>Do not bridge</span> if your token
            does something non-standard like generates passive interest or is a
            rebasing stablecoin. <br />
            <br />
            Not sure if your token is compatible?
            <ul>
              <li>
                •{' '}
                <a
                  href="https://developer.offchainlabs.com/docs/bridging_assets#the-arbitrum-generic-custom-gateway"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <u>Check the docs</u>
                </a>
              </li>
              <li>
                {' '}
                •{' '}
                <a
                  href="https://discord.gg/ZpZuw7p"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <u>Join Discord and ask</u>
                </a>
              </li>
            </ul>
            <br />
          </>
        )
      case ModalStatus.CLOSED:
        return null
    }
  }, [status, symbol])

  const buttonText = useMemo(() => {
    switch (status) {
      case ModalStatus.DEPOSIT:
      case ModalStatus.USER_ADDED_DEPOSIT:
        return 'MOVE FUNDS TO ARBITRUM'
      case ModalStatus.WITHDRAW:
        return 'MOVE FUNDS TO ETHEREUM'
      case ModalStatus.NEW_TOKEN_DEPOSITING:
        return 'BRIDGE TOKEN TO ARBITRUM'
      case ModalStatus.CLOSED:
        return ''
      default:
        break
    }
  }, [status])

  const headerText = useMemo(() => {
    switch (status) {
      case ModalStatus.DEPOSIT:
      case ModalStatus.USER_ADDED_DEPOSIT:
        return `Depositing ${symbol} To Arbitrum`
      case ModalStatus.WITHDRAW:
        return `Withdrawing ${symbol} To Ethereum`
      case ModalStatus.NEW_TOKEN_DEPOSITING:
        return 'New Token Detected!'
      case ModalStatus.CLOSED:
        return ''
      default:
        break
    }
  }, [status, symbol])

  return (
    <Transition.Root show={status !== ModalStatus.CLOSED} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-10 inset-0 overflow-y-auto"
        initialFocus={cancelButtonRef}
        onClose={closeModal}
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
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-medium text-gray-900"
                  >
                    {headerText}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">{textContent}</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    onConfirm()
                    closeModal()
                  }}
                >
                  {buttonText}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => closeModal()}
                  ref={cancelButtonRef}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
