import React, { useState } from 'react'
import Loader from 'react-loader-spinner'

import { MergedTransaction } from '../../state/app/state'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { TransactionsTableWithdrawalRow } from './TransactionsTableWithdrawalRow'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { PageParams } from '../common/TransactionHistory'
import ArbinautMoonWalking from '../../assets/ArbinautMoonWalking.webp'
import { Listbox, Menu } from '@headlessui/react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon
} from '@heroicons/react/outline'
import { ChainId, getNetworkLogo } from '../../util/networks'

const isDeposit = (tx: MergedTransaction) => {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

function EmptyTableRow({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Single empty row to set column width */}
      <tr>
        <td className="w-1/5" />
        <td className="w-1/5" />
        <td className="w-1/5" />
        <td className="w-1/5" />
        <td className="w-1/5" />
      </tr>
      <tr>
        <td colSpan={5}>
          <div className="flex h-16 items-center py-3 px-6">{children}</div>
        </td>
      </tr>
    </>
  )
}

const NoDataOverlay = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-full w-full flex-col items-center p-[2rem]">
      {children}

      <img
        src={ArbinautMoonWalking}
        alt="Moon walking Arbibaut"
        className="lg:max-h-[50%] lg:max-w-[50%]"
      />
    </div>
  )
}

export type TransactionsDataStatus = 'loading' | 'error' | 'success'

export type TransactionsTableProps = {
  status: TransactionsDataStatus
  transactions: MergedTransaction[]
  className?: string

  pageParams?: PageParams
  updatePageParams?: React.Dispatch<React.SetStateAction<PageParams>>

  // searchString?: string
  // pagination?: { pageNumber?: number; pageSize?: number }
  // handleSearch?: () => void
  // handlePagination?: () => void
}

const DepositTypeDropdown = ({
  value,
  setValue
}: {
  value: PageParams['type']
  setValue: (val: PageParams['type']) => void
}) => {
  const options = {
    ETH: { name: 'ETH', value: 'ETH', logo: ChainId.Mainnet },
    ERC20: { name: 'Other Tokens', value: 'ERC20', logo: ChainId.ArbitrumOne }
  }
  return (
    <Listbox
      as="div"
      className="relative shrink grow-0 flex-nowrap"
      value={value}
      onChange={setValue}
    >
      <Listbox.Button
        className={`arb-hover bg-arbitrum-blue flex w-max items-center space-x-1 rounded-full border-2 bg-white px-2 py-1 text-base`}
      >
        <img
          src={getNetworkLogo(options[value].logo)}
          alt={`${options[value].name} logo`}
          className="max-w-6 max-h-6"
        />
        <span>{value === 'ETH' ? 'ETH' : 'Others'}</span>
        {<ChevronDownIcon className="h-4 w-4" />}
      </Listbox.Button>

      <Listbox.Options className="absolute z-20 mt-2 rounded-xl bg-white shadow-[0px_4px_12px_#9e9e9e]">
        {Object.values(options).map(option => (
          <Listbox.Option
            key={option.value}
            value={option.value}
            className={
              'flex h-12 min-w-max cursor-pointer items-center space-x-2 px-4 hover:bg-blue-arbitrum hover:bg-[rgba(0,0,0,0.2)]'
            }
          >
            <div className="flex h-8 w-8 items-center justify-center">
              <img
                src={getNetworkLogo(option.logo)}
                alt={`${option.name} logo`}
                className="max-w-8 max-h-9"
              />
            </div>
            <span>{option.name}</span>
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Listbox>
  )
}

export function TransactionsTable({
  status,
  transactions,
  pageParams,
  updatePageParams
}: TransactionsTableProps) {
  const { isSmartContractWallet } = useNetworksAndSigners()

  const [searchString, setSearchString] = useState(pageParams?.searchString)
  const [searchError, setSearchError] = useState(false)

  function validate_txhash(addr: string) {
    return /^0x([A-Fa-f0-9]{64})$/.test(addr)
  }

  const search = () => {
    if (searchString && !validate_txhash(searchString)) {
      setSearchError(true)
      return
    }
    // search logic - using `searchString`
    updatePageParams?.(prevParams => ({
      ...prevParams,
      pageNumber: 0,
      pageSize: 10,
      searchString
    }))
  }

  const next = () => {
    updatePageParams?.(prevParams => ({
      ...prevParams,
      pageNumber: (prevParams?.pageNumber || 0) + 1
    }))
  }

  const prev = () => {
    updatePageParams?.(prevParams => ({
      ...prevParams,
      pageNumber: (prevParams?.pageNumber || 1) - 1
    }))
  }

  const changeType = (type: PageParams['type']) => {
    updatePageParams?.(prevParams => ({
      ...prevParams,
      pageNumber: 0,
      type: type
    }))
  }

  return (
    <>
      {/* top search and pagination bar */}
      <div className="sticky top-0 left-0 flex w-auto flex-nowrap items-center justify-between gap-4 rounded-tr-lg bg-white p-3 text-sm">
        {/* Deposit type dropdown */}

        {false && (
          <DepositTypeDropdown
            value={pageParams!.type}
            setValue={changeType}
          ></DepositTypeDropdown>
        )}

        {/* Search bar */}
        <div className="relative flex h-full w-full grow items-center rounded border-2 bg-white px-2">
          <SearchIcon className="h-4 w-4 shrink-0 text-gray-9" />
          <input
            className="text-normal h-full w-full p-2 font-light placeholder:text-gray-9"
            type="text"
            placeholder="Search for L1 transaction hash"
            value={searchString}
            onChange={e => {
              searchError ? setSearchError(false) : null
              setSearchString(e.target.value)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                search()
              }
            }}
          />
          {searchError ? (
            <span className="absolute bottom-0 right-4 bg-white p-[9px] text-xs text-red-400">
              Oops! Seems like a wrong L1 transaction hash.
            </span>
          ) : null}
        </div>
        {/* Pagination buttons */}
        <div className="flex  w-auto  shrink grow-0 flex-row flex-nowrap items-center justify-end text-gray-10">
          <button
            className="rounded border border-gray-10 p-1"
            onClick={prev}
            disabled={!pageParams?.pageNumber}
          >
            <ChevronLeftIcon className="h-3 w-3" />
          </button>

          <div className="whitespace-nowrap p-2">
            Page {(pageParams?.pageNumber || 0) + 1}{' '}
          </div>

          <button className="rounded border border-gray-10 p-1" onClick={next}>
            <ChevronRightIcon className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* when there are no search results found */}
      {status === 'success' && !transactions.length && searchString && (
        <NoDataOverlay>
          <div className="text-center text-white">
            <p className="whitespace-nowrap text-lg">
              Oops! Looks like nothing matched your search query.
            </p>
            <p className="whitespace-nowrap text-base">
              You can search for full or partial tx ID&apos;s.
            </p>
          </div>
        </NoDataOverlay>
      )}

      <table className="w-full overflow-hidden  rounded-b-lg bg-white">
        <thead className="text-left text-sm text-gray-10">
          <tr>
            <th className="py-3 pl-6 pr-3 font-normal">Status</th>
            <th className="px-3 py-3 font-normal">Time</th>
            <th className="px-3 py-3 font-normal">Amount</th>
            <th className="px-3 py-3 font-normal">TxID</th>
            <th className="py-3 pl-3 pr-6 font-normal">
              {/* Empty header text */}
            </th>
          </tr>
        </thead>

        <tbody>
          {status === 'loading' && (
            <EmptyTableRow>
              <div className="flex flex-row items-center space-x-3">
                <Loader type="TailSpin" color="black" width={16} height={16} />
                <span className="text-sm font-medium">
                  Loading transactions
                </span>
              </div>
            </EmptyTableRow>
          )}

          {status === 'error' && (
            <EmptyTableRow>
              <span className="text-sm font-medium text-brick-dark">
                Failed to load transactions
              </span>
            </EmptyTableRow>
          )}

          {status === 'success' && (
            <>
              {transactions.length > 0 ? (
                transactions.map((tx, index) => {
                  const isFinalRow = index === transactions.length - 1

                  return isDeposit(tx) ? (
                    <TransactionsTableDepositRow
                      key={`${tx.txId}-${tx.direction}`}
                      tx={tx}
                      className={!isFinalRow ? 'border-b border-gray-1' : ''}
                    />
                  ) : (
                    <TransactionsTableWithdrawalRow
                      key={`${tx.txId}-${tx.direction}`}
                      tx={tx}
                      className={!isFinalRow ? 'border-b border-gray-1' : ''}
                    />
                  )
                })
              ) : (
                <EmptyTableRow>
                  <span className="text-sm font-medium">
                    {isSmartContractWallet
                      ? 'You can see tx history in your smart contract wallet'
                      : 'No transactions'}
                  </span>
                </EmptyTableRow>
              )}
            </>
          )}
        </tbody>
      </table>
    </>
  )
}
