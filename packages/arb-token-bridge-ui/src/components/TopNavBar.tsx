import { Tab } from '@headlessui/react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'
import { useTransactionReminderInfo } from './TransactionHistory/useTransactionReminderInfo'

export enum TabParamEnum {
  BRIDGE = 0,
  TX_HISTORY = 1
}

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

  return (
    <Tab.List
      className={twMerge(
        'grid w-full max-w-[600px] grid-cols-2 bg-white/20 p-[8px] text-white md:rounded'
      )}
    >
      <StyledTab aria-label="Switch to Bridge Tab">
        <PaperAirplaneIcon className="h-3 w-3" />
        Bridge
      </StyledTab>
      <StyledTab aria-label="Switch to Transaction History Tab">
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
