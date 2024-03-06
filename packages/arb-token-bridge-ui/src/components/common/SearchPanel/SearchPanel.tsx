import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'
import {
  ArrowRightIcon,
  ArrowSmallLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

import { Loader } from '../atoms/Loader'

enum Panel {
  MAIN,
  SECONDARY
}

function usePanel(panel: Panel) {
  const { currentPanel, setCurrentPanel } = useContext(SearchPanelContext)
  const setPanel = useCallback(
    () => setCurrentPanel(panel),
    [panel, setCurrentPanel]
  )
  const isActivePanel = currentPanel === panel

  return {
    setPanel,
    isActivePanel
  }
}

const SearchPanelContext = createContext<{
  currentPanel: Panel
  setCurrentPanel: (panel: Panel) => void
  // eslint-disable-next-line @typescript-eslint/no-empty-function
}>({ currentPanel: Panel.MAIN, setCurrentPanel: () => {} })

function SearchPanel({ children }: { children: React.ReactNode }) {
  const [currentPanel, setCurrentPanel] = useState(Panel.MAIN)
  const provided = useMemo(
    () => ({
      currentPanel,
      setCurrentPanel: (panel: Panel) => setCurrentPanel(panel)
    }),
    [currentPanel]
  )
  return (
    <SearchPanelContext.Provider value={provided}>
      {children}
    </SearchPanelContext.Provider>
  )
}

function MainPageCTA({
  children,
  onClick,
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  const { setPanel: showSecondaryPage } = usePanel(Panel.SECONDARY)

  const onClickHandler = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      showSecondaryPage()
      onClick?.(event)
    },
    [onClick, showSecondaryPage]
  )

  return (
    <button
      className={twMerge(
        'arb-hover text-gray flex items-center gap-2 text-sm',
        className
      )}
      onClick={onClickHandler}
      {...props}
    >
      <span>{children}</span>
      <ArrowRightIcon className="h-3 w-3 stroke-[3px]" />
    </button>
  )
}
SearchPanel.MainPageCTA = MainPageCTA

function CloseButton({
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={twMerge('arb-hover', className)} {...props}>
      <XMarkIcon className="h-7 w-7 text-gray-7 lg:h-5 lg:w-5" />
    </button>
  )
}
SearchPanel.CloseButton = CloseButton

function SearchPanelMainPage({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isActivePanel: shouldShowMain } = usePanel(Panel.MAIN)

  if (!shouldShowMain) {
    return null
  }

  if (!className) {
    return children
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}
SearchPanel.MainPage = SearchPanelMainPage

function SearchPanelPageTitle({
  title,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { title: string }) {
  return (
    <div
      className={twMerge(
        'flex flex-row items-center justify-between pb-4',
        className
      )}
      {...props}
    >
      <span className="text-xl">{title}</span>
      {children}
    </div>
  )
}
SearchPanel.PageTitle = SearchPanelPageTitle

function SearchPanelSecondaryPage({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isActivePanel: shouldShowSecondary } = usePanel(Panel.SECONDARY)

  if (!shouldShowSecondary) {
    return null
  }

  return <div {...props}>{children}</div>
}
SearchPanel.SecondaryPage = SearchPanelSecondaryPage

function SecondaryPageCTA({
  children,
  className,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  const { setPanel: showMainPage } = usePanel(Panel.MAIN)

  const onClickHandler = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      showMainPage()
      onClick?.(event)
    },
    [onClick, showMainPage]
  )

  return (
    <div className="mt-4 flex justify-start">
      <button
        className={twMerge(
          'arb-hover flex items-center space-x-2 text-sm',
          className
        )}
        onClick={onClickHandler}
        {...props}
      >
        <ArrowSmallLeftIcon className="h-3 w-3 stroke-[3px]" />
        <span>{children}</span>
      </button>
    </div>
  )
}
SearchPanel.SecondaryPageCTA = SecondaryPageCTA

function LoaderWithMessage({ loadingMessage }: { loadingMessage?: string }) {
  return (
    <span className="flex flex-row items-center gap-2 text-sm font-normal text-gray-6">
      <Loader color="white" size="small" />
      {loadingMessage}
    </span>
  )
}
SearchPanel.LoaderWithMessage = LoaderWithMessage

export { SearchPanel }
