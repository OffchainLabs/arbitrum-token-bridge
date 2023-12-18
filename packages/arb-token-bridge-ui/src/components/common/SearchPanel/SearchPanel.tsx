import { PropsWithChildren, useState } from 'react'
import { ArrowSmallLeftIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Loader } from '../atoms/Loader'

enum Panel {
  MAIN,
  LISTS
}

function SearchPanelMainPage({
  mainPageTitle,
  isLoading,
  loadingMessage,
  bottomRightCTAonClick,
  bottomRightCTAtext,
  children
}: PropsWithChildren<{
  mainPageTitle: string
  isLoading?: boolean
  loadingMessage?: string
  bottomRightCTAonClick?: () => void
  bottomRightCTAtext?: string
}>) {
  return (
    <>
      <div className="flex flex-row items-center justify-between pb-4">
        <span className="text-xl font-medium">{mainPageTitle}</span>
        <button className="arb-hover" onClick={close}>
          <XMarkIcon className="h-6 w-6 text-gray-5" />
        </button>
      </div>
      {children}
      <div className="flex justify-end pt-6">
        {isLoading ? (
          <span className="flex flex-row items-center gap-2 text-sm font-normal text-gray-6">
            <Loader color="#28A0F0" size="small" />
            {loadingMessage}
          </span>
        ) : (
          <button
            className="arb-hover text-gray text-sm font-medium text-blue-link"
            onClick={bottomRightCTAonClick}
          >
            {bottomRightCTAtext}
          </button>
        )}
      </div>
    </>
  )
}

export function SearchPanel({
  close,
  SearchPanelSecondaryPage,
  mainPageTitle,
  secondPageTitle,
  isLoading,
  loadingMessage,
  bottomRightCTAtext,
  children
}: PropsWithChildren<{
  close: () => void
  onImportToken: (address: string) => void
  SearchPanelSecondaryPage: React.ReactNode
  mainPageTitle: string
  secondPageTitle: string
  isLoading?: boolean
  loadingMessage?: string
  bottomRightCTAtext?: string
}>) {
  const [currentPanel, setCurrentPanel] = useState(Panel.MAIN)

  if (currentPanel === Panel.MAIN) {
    return (
      <SearchPanelMainPage
        mainPageTitle={mainPageTitle}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        bottomRightCTAtext={bottomRightCTAtext}
        bottomRightCTAonClick={() => setCurrentPanel(Panel.LISTS)}
      >
        {children}
      </SearchPanelMainPage>
    )
  }

  return (
    <>
      <div className="flex flex-row items-center justify-between pb-4">
        <span className="text-xl font-medium">{secondPageTitle}</span>
        <button className="arb-hover" onClick={close}>
          <XMarkIcon className="h-6 w-6 text-gray-5" />
        </button>
      </div>
      <div className="flex justify-start pb-6">
        <button
          className="arb-hover flex items-center space-x-2 text-sm font-medium text-blue-link"
          onClick={() => setCurrentPanel(Panel.MAIN)}
        >
          <ArrowSmallLeftIcon className="h-6 w-6" />
          <span>Back to {mainPageTitle}</span>
        </button>
      </div>
      {SearchPanelSecondaryPage}
    </>
  )
}
