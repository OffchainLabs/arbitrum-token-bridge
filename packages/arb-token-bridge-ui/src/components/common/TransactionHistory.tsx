import { Tab } from '@headlessui/react'
import { Fragment } from 'react'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { getNetworkLogo, getNetworkName } from '../../util/networks'
import { TransactionsTable } from '../TransactionsTable/TransactionsTable'

export const TransactionHistory = () => {
  const {
    app: { mergedTransactions, arbTokenBridge }
  } = useAppState()

  const { l1, l2 } = useNetworksAndSigners()

  return (
    <Tab.Group>
      <Tab.List className={'flex flex-row'}>
        <Tab as={Fragment}>
          {({ selected }) => (
            <button
              className={`${
                !selected ? 'arb-hover text-white' : ''
              } flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base ${
                selected && ` bg-white`
              }`}
            >
              {/* Deposits */}
              {selected && (
                <img
                  src={getNetworkLogo(l2.network.chainID)}
                  className="max-w-6 max-h-6"
                  alt="Deposit"
                />
              )}
              {`To ${getNetworkName(l2.network.chainID)}`}
            </button>
          )}
        </Tab>
        <Tab as={Fragment}>
          {({ selected }) => (
            <button
              className={`${
                !selected ? 'arb-hover text-white' : ''
              } flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base ${
                selected && `bg-white`
              }`}
            >
              {/* Withdrawals */}
              {selected && (
                <img
                  src={getNetworkLogo(l1.network.chainID)}
                  className="max-w-6 max-h-6"
                  alt="Withdraw"
                />
              )}
              {`To ${getNetworkName(l1.network.chainID)}`}
            </button>
          )}
        </Tab>
      </Tab.List>
      <Tab.Panel className="overflow-scroll">
        <TransactionsTable type="deposits" />
      </Tab.Panel>
      <Tab.Panel className="overflow-scroll">
        <TransactionsTable type="withdrawals" />
      </Tab.Panel>
    </Tab.Group>
  )
}
