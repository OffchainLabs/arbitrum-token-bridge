import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { AutoSizer, List, ListRowRenderer } from 'react-virtualized'
import React from 'react'

export const SearchPanelTable = ({
  searchInputPlaceholder,
  searchInputValue,
  SearchFieldCTA,
  onSearchInputChange,
  onSubmit = event => {
    event.preventDefault()
  },
  errorMessage,
  rowCount,
  rowHeight,
  rowRenderer
}: {
  searchInputPlaceholder: string
  searchInputValue: string
  SearchFieldCTA?: React.ReactNode
  onSearchInputChange: React.ChangeEventHandler<HTMLInputElement>
  onSubmit?: React.FormEventHandler<HTMLFormElement>
  errorMessage: string
  rowCount: number
  rowHeight: number
  rowRenderer: ListRowRenderer
}) => {
  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSubmit} className="flex flex-col">
        <div className="flex items-stretch gap-2">
          <div className="relative flex h-full w-full grow items-center rounded-lg border-[1px] border-gray-dark bg-white px-2 text-gray-dark shadow-input">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-dark" />

            <input
              type="search"
              value={searchInputValue}
              onChange={onSearchInputChange}
              placeholder={searchInputPlaceholder}
              className="h-full w-full p-2 text-sm font-light text-dark placeholder:text-xs placeholder:text-gray-dark"
            />
          </div>
          {SearchFieldCTA}
        </div>
        {!!errorMessage && (
          <p className="text-xs text-red-400">{errorMessage}</p>
        )}
      </form>
      <div
        className="h-[400px] rounded-md border border-gray-2 bg-white lg:shadow-[0px_4px_10px_rgba(120,120,120,0.25)]"
        data-cy="tokenSearchList"
      >
        <AutoSizer>
          {({ height, width }) => (
            <List
              width={width - 2}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              rowRenderer={rowRenderer}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  )
}
