import React, { ReactEventHandler } from 'react'

export function TransactionsTableSwitch({
  tabs
}: {
  tabs: {
    handleClick: ReactEventHandler<HTMLButtonElement>
    isActive: boolean
    text: React.ReactNode
  }[]
}) {
  return (
    <div className="sticky left-0 top-0 bg-white p-4 pt-4 text-lg">
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
