import { Tab } from '@headlessui/react'
import { Fragment } from 'react'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getNetworkLogo, getNetworkName } from '../../util/networks'
import { TransactionsTable } from '../TransactionsTable/TransactionsTable'

export const TransactionHistory = () => {
  const { l1, l2 } = useNetworksAndSigners()

  return (
    <div>
      <Tab.Group>
        <Tab.List className={'flex flex-row'}>
          <Tab as={Fragment}>
            {({ selected }) => (
              <button
                className={`${
                  !selected ? 'arb-hover text-white' : ''
                } roundedTabRight relative flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base ${
                  selected && ` selected bg-white`
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
                } roundedTabRight roundedTabLeft relative flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base ${
                  selected && `selected bg-white`
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
        <Tab.Panel className="overflow-auto">
          <TransactionsTable type="deposits" />
        </Tab.Panel>
        <Tab.Panel className="overflow-auto">
          <TransactionsTable type="withdrawals" />
        </Tab.Panel>
      </Tab.Group>
    </div>
  )
}
