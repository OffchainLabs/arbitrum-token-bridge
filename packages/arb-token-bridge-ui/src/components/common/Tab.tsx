import { Tab } from '@headlessui/react'
import { forwardRef, PropsWithChildren } from 'react'

export type TabButtonProps = PropsWithChildren<
  React.ButtonHTMLAttributes<HTMLButtonElement>
>

export const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(
  (props, ref) => {
    const tabButtonClassName =
      'text-white px-3 mr-2 pb-1 ui-selected:border-b-4 ui-selected:border-white ui-not-selected:text-white/80 arb-hover'

    return (
      <Tab
        ref={ref}
        className={`${tabButtonClassName} ${props.className ?? ''}`}
        {...props}
      >
        {props.children}
      </Tab>
    )
  }
)

TabButton.displayName = 'TabButton'
