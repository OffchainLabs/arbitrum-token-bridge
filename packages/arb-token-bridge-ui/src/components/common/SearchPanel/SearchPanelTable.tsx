import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import React, { PropsWithChildren } from 'react'

type SearchPanelTableProps = {
  searchInputPlaceholder: string
  searchInputValue: string
  searchInputOnChange: React.ChangeEventHandler<HTMLInputElement>
  SearchInputButton?: React.JSX.Element
  onSubmit?: React.FormEventHandler<HTMLFormElement>
  errorMessage: string
  dataCy?: string
}

export const SearchPanelTable = ({
  searchInputPlaceholder,
  searchInputValue,
  searchInputOnChange,
  SearchInputButton,
  onSubmit = event => {
    event.preventDefault()
  },
  errorMessage,
  children,
  dataCy
}: PropsWithChildren<SearchPanelTableProps>) => {
  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSubmit} className="flex flex-col">
        <div className="flex items-stretch gap-2">
          <div className="relative flex h-full w-full grow items-center rounded border-[1px] border-gray-dark bg-black/30 px-2 text-white shadow-input">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0" />
            <input
              type="search"
              placeholder={searchInputPlaceholder}
              value={searchInputValue}
              onChange={searchInputOnChange}
              className="h-full w-full bg-transparent p-2 text-sm font-light placeholder:text-xs placeholder:text-white"
            />
          </div>
          {SearchInputButton}
        </div>
        {!!errorMessage && (
          <p className="text-xs text-red-400">{errorMessage}</p>
        )}
      </form>
      <div
        className="sm:shadow-search-panel h-[calc(100vh_-_190px)] overflow-hidden rounded border border-gray-dark bg-black/30 sm:h-[400px]"
        data-cy={dataCy}
      >
        {children}
      </div>
    </div>
  )
}
