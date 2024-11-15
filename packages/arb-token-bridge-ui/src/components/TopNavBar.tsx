import { Tab } from '@headlessui/react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'
import { useTransactionReminderInfo } from './TransactionHistory/useTransactionReminderInfo'
import { useTransactionHistoryUpdater } from './TransactionHistory/useTransactionHistoryUpdater'

function StyledTab({ children, ...props }: PropsWithChildren) {
  return (
    <Tab
      className="flex h-full items-center justify-center gap-2 rounded p-1 text-lg ui-selected:bg-black/75"
      {...props}
    >
      {children}
    </Tab>
  )
}

StyledTab.displayName = 'StyledTab'

export function TopNavBar() {
  const { colorClassName } = useTransactionReminderInfo()

  useTransactionHistoryUpdater()

  return (
    <Tab.List
      className={twMerge(
        'grid w-full max-w-[600px] grid-cols-2 bg-white/20 p-[8px] text-white md:rounded'
      )}
    >
      {/* <StyledTab>
        <Image
          src="/icons/wallet.svg"
          width={24}
          height={24}
          alt="wallet icon"
        />
        Buy
      </StyledTab> */}
      <StyledTab>
        <PaperAirplaneIcon className="h-3 w-3" />
        Bridge
      </StyledTab>
      <StyledTab>
        <Image
          src="/icons/history.svg"
          width={24}
          height={24}
          alt="history icon"
        />
        Txn History{' '}
        <span
          className={twMerge('h-3 w-3 rounded-full', colorClassName.light)}
        />
      </StyledTab>
    </Tab.List>
  )
}
