import { useEffect, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { TransactionsTableProps } from './TransactionsTable'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { Loader } from '../../common/atoms/Loader'

type TableActionHeaderProps = Omit<
  TransactionsTableProps,
  'error' | 'pendingTransactions'
>

export const TableActionHeader = ({
  type,
  pageParams,
  setPageParams,
  transactions,
  loading
}: TableActionHeaderProps) => {
  const layerType = type === 'deposits' ? 'L1' : 'L2'

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
      pageSize: 10,
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
      className={`sticky left-0 top-0 flex w-auto flex-nowrap items-center justify-between gap-4 rounded-tr-lg bg-white p-3 text-sm ${
        type !== 'deposits' && 'rounded-tl-lg'
      }`}
    >
      {/* Search bar */}
      <div className="relative flex h-full w-full grow items-center rounded-lg border-[1px] border-gray-dark bg-white px-2 text-gray-dark shadow-input">
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-dark" />
        <input
          className="text-normal h-full w-full p-2 font-light text-dark placeholder:text-gray-dark"
          type="text"
          placeholder={`Search for a full or partial ${layerType} tx ID`}
          value={searchString}
          onChange={e => {
            setSearchString(e.target.value)
          }}
        />
        {showDebounceLoader && <Loader color="black" size="small" />}
      </div>

      {/* Pagination buttons */}
      {!hidePaginationBtns && (
        <div className="flex w-auto shrink grow-0 flex-row flex-nowrap items-center justify-end text-gray-dark">
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
