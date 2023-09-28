import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { TransactionsTableProps } from './TransactionsTable'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { Loader } from '../../common/atoms/Loader'
import { useChainLayers } from '../../../hooks/useChainLayers'

type TableActionHeaderProps = Omit<
  TransactionsTableProps,
  'error' | 'pendingTransactions' | 'type'
> & {
  type: 'deposits' | 'withdrawals' | 'cctp'
  showSearch: boolean
}

export const TableActionHeader = ({
  type,
  pageParams,
  setPageParams,
  transactions,
  loading,
  isSmartContractWallet,
  showSearch
}: TableActionHeaderProps) => {
  const { parentLayer, layer } = useChainLayers()
  const layerType = type === 'deposits' ? parentLayer : layer

  const [searchString, setSearchString] = useState(pageParams.searchString)

  const noMoreRecordsInNextPage = transactions.length < pageParams.pageSize
  const disableNextBtn = loading || noMoreRecordsInNextPage // if transactions are less than pagesize
  const disablePrevBtn = loading || !pageParams.pageNumber // if page number is 0, then don't prev.
  const hidePaginationBtns =
    noMoreRecordsInNextPage && pageParams.pageNumber === 0 // hide the pagination buttons if there is no point of showing next/prev btns

  const searchStringDebounced = useDebouncedValue(searchString, 1500)
  const trimmedSearchString = searchString.trim()

  const onClickNext = () => {
    if (!disableNextBtn) {
      setPageParams(prevParams => ({
        ...prevParams,
        pageNumber: prevParams.pageNumber + 1
      }))
    }
  }

  const onClickPrev = () => {
    if (!disablePrevBtn) {
      setPageParams(prevParams => ({
        ...prevParams,
        pageNumber: prevParams.pageNumber - 1
      }))
    }
  }

  const search = () => {
    // search logic - using `searchString`
    setPageParams(prevParams => ({
      ...prevParams,
      pageNumber: 0,
      pageSize: pageParams.pageSize,
      searchString: trimmedSearchString
    }))
  }

  useEffect(() => {
    // when the debounced value of searchString changes, only then fire the actual search call
    if (pageParams.searchString !== searchStringDebounced) {
      search()
    }
  }, [searchStringDebounced])

  const showDebounceLoader =
    (searchString && loading) || pageParams.searchString !== trimmedSearchString // for immediate UX feedback of search results fetching while typing

  return (
    <div
      className={twMerge(
        'sticky left-0 top-0 flex w-auto flex-nowrap items-center justify-between gap-4 bg-white p-3 text-sm',
        isSmartContractWallet ? 'rounded-t-lg' : '',
        type === 'deposits' ? 'rounded-tl-none' : ''
      )}
    >
      {/* Search bar */}
      {showSearch && (
        <div className="relative flex h-full w-full grow items-center rounded-lg border-[1px] border-gray-dark bg-white px-2 text-gray-dark shadow-input">
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-dark" />
          <input
            className="text-normal h-full w-full p-2 font-light text-dark placeholder:text-gray-dark"
            type="text"
            placeholder={
              layerType
                ? `Search for a full or partial ${layerType} tx ID`
                : 'Search for a full or partial tx ID'
            }
            value={searchString}
            onChange={e => {
              setSearchString(e.target.value)
            }}
          />
          {showDebounceLoader && <Loader color="black" size="small" />}
        </div>
      )}

      {/* Pagination buttons */}
      {!hidePaginationBtns && (
        <div
          className={twMerge(
            'flex w-auto shrink grow-0 flex-row flex-nowrap items-center justify-end text-gray-dark',
            !showSearch && 'ml-auto' // Align the arrows on the right if no search input is displayed
          )}
        >
          <button
            disabled={disablePrevBtn}
            className={`rounded border border-gray-dark p-1 ${
              disablePrevBtn
                ? 'cursor-not-allowed opacity-30'
                : 'cursor-pointer'
            }`}
            aria-label={`load previous ${type}`}
            onClick={onClickPrev}
          >
            <ChevronLeftIcon className="h-3 w-3" />
          </button>

          <div className="whitespace-nowrap p-2">
            Page {pageParams.pageNumber + 1}{' '}
          </div>

          <button
            disabled={disableNextBtn}
            className={`rounded border border-gray-dark p-1 ${
              disableNextBtn
                ? 'cursor-not-allowed opacity-30'
                : 'cursor-pointer'
            }`}
            aria-label={`load next ${type}`}
            onClick={onClickNext}
          >
            <ChevronRightIcon className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
