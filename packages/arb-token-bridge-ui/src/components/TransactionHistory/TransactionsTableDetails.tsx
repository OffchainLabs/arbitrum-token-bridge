import { Dialog, DialogBackdrop, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Fragment, useMemo } from 'react'
import { shallow } from 'zustand/shallow'

import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { getProviderForChainId } from '../../token-bridge-sdk/utils'
import { TransactionDetailsContent } from './TransactionDetailsContent'
import { useTxDetailsStore } from './TransactionHistory'
import { useTransactionHistoryAddressStore } from './TransactionHistorySearchBar'

export const TransactionsTableDetails = () => {
  const sanitizedAddress = useTransactionHistoryAddressStore(
    state => state.sanitizedAddress
  )
  const { txFromStore, isOpen, close, reset } = useTxDetailsStore(
    state => ({
      txFromStore: state.tx,
      isOpen: state.isOpen,
      close: state.close,
      reset: state.reset
    }),
    shallow
  )

  const { transactions } = useTransactionHistory(sanitizedAddress)

  const tx = useMemo(() => {
    if (!txFromStore) {
      return null
    }

    // we need to get tx from the hook to make sure we have up to date details, e.g. status
    return transactions.find(
      t =>
        t.parentChainId === txFromStore.parentChainId &&
        t.childChainId === txFromStore.childChainId &&
        t.txId === txFromStore.txId
    )
  }, [transactions, txFromStore])

  const childProvider = getProviderForChainId(tx?.childChainId ?? 0)
  const nativeCurrency = useNativeCurrency({ provider: childProvider })

  if (!tx || !sanitizedAddress || !nativeCurrency) {
    return null
  }

  return (
    <Dialog
      as="div"
      open={typeof tx !== 'undefined'}
      className="relative z-40"
      onClose={close}
    >
      <Transition show={isOpen} as={Fragment}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-70"
          leave="ease-in duration-200"
          leaveFrom="opacity-70"
          leaveTo="opacity-0"
        >
          <DialogBackdrop
            className="fixed inset-0 bg-black opacity-70"
            aria-hidden="true"
          />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center text-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
              afterLeave={reset}
            >
              <Dialog.Panel className="h-screen w-screen transform overflow-hidden rounded border border-white/10 bg-dark p-4 text-left align-middle shadow shadow-white/10 transition-all sm:h-auto sm:w-full sm:max-w-[488px]">
                <Dialog.Title
                  className="mb-4 flex items-center justify-between text-lg font-light text-white"
                  as="h3"
                >
                  Transaction details
                  <button
                    onClick={close}
                    className="arb-hover"
                    aria-label="Close transaction details popup"
                  >
                    <XMarkIcon height={20} />
                  </button>
                </Dialog.Title>

                <TransactionDetailsContent
                  tx={tx}
                  walletAddress={sanitizedAddress}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Transition>
    </Dialog>
  )
}
