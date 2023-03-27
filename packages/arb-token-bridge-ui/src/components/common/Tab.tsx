import { Tab } from '@headlessui/react'
import { forwardRef, PropsWithChildren } from 'react'

export type TabButtonProps = PropsWithChildren<
  React.ButtonHTMLAttributes<HTMLButtonElement>
>

export const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(
  (props, ref) => {
    const tabButtonClassName =
      'rounded-tl-lg rounded-tr-lg px-8 py-3 transition-colors duration-300 ui-selected:bg-white ui-not-selected:bg-blue-arbitrum ui-not-selected:text-white ui-not-selected:hover:text-gray-6'

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
