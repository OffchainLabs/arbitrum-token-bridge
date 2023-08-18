import React, { ReactEventHandler } from 'react'
import { twMerge } from 'tailwind-merge'

export function TransactionsTableSwitch({
  className,
  tabs
}: {
  className?: string
  tabs: {
    handleClick: ReactEventHandler<HTMLButtonElement>
    isActive: boolean
    text: React.ReactNode
  }[]
}) {
  return (
    <div
      className={twMerge(
        'sticky left-0 top-0 rounded-tr-lg bg-white p-4 pt-6 text-lg',
        className
      )}
    >
      {tabs.map(({ handleClick, isActive, text }, index) => (
        <button
          key={index}
          onClick={handleClick}
          className={
            isActive
              ? 'pointer-events-none border-b-4 border-black'
              : 'arb-hover border-gray border-b-2 pb-[1px]'
          }
        >
          <span className="px-4">{text}</span>
        </button>
      ))}
    </div>
  )
}
