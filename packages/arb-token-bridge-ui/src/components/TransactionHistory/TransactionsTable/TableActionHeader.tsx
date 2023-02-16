import { useEffect, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon
} from '@heroicons/react/outline'
import { TransactionsTableProps } from './TransactionsTable'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import Loader from 'react-loader-spinner'

type TableActionHeaderProps = TransactionsTableProps

export const TableActionHeader = ({
  type,
  pageParams,
  setPageParams,
  transactions,
  loading,
  error
}: TableActionHeaderProps) => {
  const layerType = type === 'deposits' ? 'L1' : 'L2'

  const [searchString, setSearchString] = useState(pageParams.searchString)

  const disableNextBtn = loading || transactions.length < pageParams.pageSize // if transactions are less than pagesize
  const disablePrevBtn = loading || !pageParams.pageNumber // if page number is 0, then don't prev.

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

  const search = (searchString: string) => {
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
      search(searchStringDebounced)
    }
  }, [searchStringDebounced])

  const showDebounceLoader =
    (searchString && loading) || pageParams.searchString !== trimmedSearchString // for immediate UX feedback of search results fetching while typing

  return (
    <div
      className={`sticky top-0 left-0 flex w-auto flex-nowrap items-center justify-between gap-4 rounded-tr-lg bg-white p-3 text-sm ${
        type !== 'deposits' && 'rounded-tl-lg'
      }`}
    >
      {/* Search bar */}
      <div className="relative flex h-full w-full grow items-center rounded border-2 bg-white px-2">
        <SearchIcon className="h-4 w-4 shrink-0 text-gray-9" />
        <input
          className="text-normal h-full w-full p-2 font-light placeholder:text-gray-9"
          type="text"
          placeholder={`Search for ${layerType} transaction hash`}
          value={searchString}
          onChange={e => {
            setSearchString(e.target.value)
          }}
        />
        {showDebounceLoader && (
          <Loader type="TailSpin" color="black" width={16} height={16} />
        )}
      </div>

      {/* Pagination buttons */}
      <div className="flex  w-auto  shrink grow-0 flex-row flex-nowrap items-center justify-end text-gray-10">
        <button
          className={`rounded border border-gray-10 p-1 ${
            disablePrevBtn ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
          }`}
          onClick={onClickPrev}
        >
          <ChevronLeftIcon className="h-3 w-3" />
        </button>

        <div className="whitespace-nowrap p-2">
          Page {pageParams.pageNumber + 1}{' '}
        </div>

        <button
          className={`rounded border border-gray-10 p-1 ${
            disableNextBtn ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
          }`}
          onClick={onClickNext}
        >
          <ChevronRightIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
