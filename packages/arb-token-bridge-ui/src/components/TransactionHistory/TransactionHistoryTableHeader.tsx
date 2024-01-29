import { Fragment, PropsWithChildren } from 'react'
import Image from 'next/image'
import FunnelIcon from '@/icons/funnel.svg'
import { Popover, Transition } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'

import { FilterType } from '../../hooks/useTransactionHistoryFilters'
import { TransactionHistoryChainFilter } from './TransactionHistoryChainFilter'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'

type TableHeaderProps = PropsWithChildren<{
  address: `0x${string}` | undefined
  filter?: FilterType
  restart: () => void
}>

export const TransactionHistoryTableHeader = ({
  children,
  address,
  restart,
  filter
}: TableHeaderProps) => {
  const filterable = typeof filter !== 'undefined'
  const { isFilterApplied } = useTransactionHistory(address)

  const filtered = filter ? isFilterApplied[filter] : false

  const isChainsFilter =
    filter === FilterType.HiddenSourceChains ||
    filter === FilterType.HiddenDestinationChains

  return (
    <Popover>
      {({ close }) => (
        <div className="pt-4">
          <Popover.Button
            disabled={!filterable}
            className={twMerge(
              'arb-hover relative flex h-full items-center rounded p-2 text-left text-sm font-normal',
              filtered && 'bg-white/30'
            )}
          >
            {children}
            {filterable && (
              <Image
                className="ml-2"
                width={16}
                height={16}
                src={FunnelIcon}
                alt="Funnel icon"
              />
            )}
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <div className="absolute z-50">
              {filter && (
                <Popover.Panel>
                  {isChainsFilter && (
                    <TransactionHistoryChainFilter
                      type={filter}
                      address={address}
                      onApply={() => {
                        close()
                        restart()
                      }}
                    />
                  )}
                </Popover.Panel>
              )}
            </div>
          </Transition>
        </div>
      )}
    </Popover>
  )
}
