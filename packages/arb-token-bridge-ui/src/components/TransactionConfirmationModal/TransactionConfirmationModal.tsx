import { Fragment, useMemo, useRef } from 'react'

import { Dialog, Transition } from '@headlessui/react'
import { ExclamationIcon } from '@heroicons/react/outline'

export enum ModalStatus {
  CLOSED,
  DEPOSIT,
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
            You are about to deposit {symbol} from Ethereum into Arbitrum! <br />{' '}
            <br /> It will take <b>10 minutes </b> for you to see your balance
            credited on Arbitrum. Moving your funds back to Ethereum (if you later
            wish to do so) takes ~1 week when using the Canonical Arbitrum
            Bridge (other Ethereum/Arbitrum bridges offer "fast-exits.") <br />{' '}
            <br />
            Would you like to proceed?
          </>
        )
      case ModalStatus.WITHDRAW:
        return (
          <>
            You are about to initiate a {symbol} withdrawal from Arbitrum to
            Ethereum! Once a withdrawal is initiated, you will have to
            <b> wait 8 days </b>, after which you can claim your funds on
            Ethereum mainnet (L1). Note this claim will incur a second L1 gas
            fee.
          </>
        )
      case ModalStatus.NEW_TOKEN_DEPOSITING:
        return (
          <>
            {symbol} has not yet been bridged into Arbitrum — you could be the
            first! <br /> <br />
            Two things to consider:
            <ul>
              <li>
                - The initial deposit is more expensive than the following ones.
              </li>
              <li>
                - Some tokens will break with the token bridge. Do not bridge if
                the balance of {symbol}
                changes in unexpected ways (such as passive interest or rebasing
                stablecoins).
                <a href="https://developer.offchainlabs.com/docs/bridging_assets#default-standard-bridging">
                  here
                </a>
                . If you're not a developer and not sure, join our Discord and
                ask the community!
              </li>
            </ul>
            <br />
            Are you sure you want to proceed?
          </>
        )
      case ModalStatus.CLOSED:
        return null
    }
  }, [status, symbol])

  const buttonText = useMemo(() => {
    switch (status) {
      case ModalStatus.DEPOSIT:
        return 'Deposit'
      case ModalStatus.WITHDRAW:
        return 'Withdraw'
      case ModalStatus.NEW_TOKEN_DEPOSITING:
        return 'Deposit/Deploy'
      case ModalStatus.CLOSED:
        return ''
      default:
        break
    }
  }, [status])

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
                    {isDepositing ? 'Depositing' : 'Withdrawing'}
                    {` ${amount} ${symbol}`}
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
                  Cancel
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
