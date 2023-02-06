import Tippy from '@tippyjs/react'
import { BellIcon, XIcon } from '@heroicons/react/outline'
import useLocalStorage from '@rehooks/local-storage'

export const TransactionHistoryTooltip = ({
  isVisible,
  onClose,
  children
}: {
  isVisible: boolean
  onClose: () => void
  children: React.ReactElement
}) => {
  return (
    <Tippy
      visible={isVisible}
      theme="light"
      interactive
      content={
        <div className="flex items-center gap-1 text-dark">
          <BellIcon className="h-4 w-4 animate-pulse text-red-800" />
          <span className="whitespace-nowrap">
            See transaction history here
          </span>
          <XIcon className="h-4 w-4 cursor-pointer" onClick={onClose} />
        </div>
      }
    >
      {children}
    </Tippy>
  )
}
