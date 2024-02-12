import React, {
  PropsWithChildren,
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

function MainPageCTA({ children }: { children: React.ReactNode }) {
  const { setPanel: showSecondaryPage } = usePanel(Panel.SECONDARY)
  return (
    <button
      className="arb-hover text-gray flex items-center gap-2 text-sm"
      onClick={showSecondaryPage}
    >
      <span>{children}</span>
      <ArrowRightIcon className="h-3 w-3 stroke-[3px]" />
    </button>
  )
}
SearchPanel.MainPageCTA = MainPageCTA

function CloseButton({ onClick }: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="arb-hover" onClick={onClick}>
      <XMarkIcon className="h-8 w-8 text-gray-7" />
    </button>
  )
}
SearchPanel.CloseButton = CloseButton

function SearchPanelMainPage({
  children,
  className
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isActivePanel: shouldShowMain } = usePanel(Panel.MAIN)

  if (!shouldShowMain) {
    return null
  }

  if (!className) {
    return children
  }

  return <div className={className}>{children}</div>
}
SearchPanel.MainPage = SearchPanelMainPage

function SearchPanelPageTitle({
  title,
  children
}: PropsWithChildren<{ title: string }>) {
  return (
    <div className="flex flex-row items-center justify-between pb-4">
      <span className="text-xl">{title}</span>
      {children}
    </div>
  )
}
SearchPanel.PageTitle = SearchPanelPageTitle

function SearchPanelSecondaryPage({
  children,
  className
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isActivePanel: shouldShowSecondary } = usePanel(Panel.SECONDARY)

  if (!shouldShowSecondary) {
    return null
  }

  return <div className={className}>{children}</div>
}
SearchPanel.SecondaryPage = SearchPanelSecondaryPage

function SecondaryPageCTA({
  children
}: React.HTMLAttributes<HTMLButtonElement>) {
  const { setPanel: showMainPage } = usePanel(Panel.MAIN)

  return (
    <div className="mt-4 flex justify-start">
      <button
        className="arb-hover flex items-center space-x-2 text-sm"
        onClick={showMainPage}
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

export default SearchPanel
