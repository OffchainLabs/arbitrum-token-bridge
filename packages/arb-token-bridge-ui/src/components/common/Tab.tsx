import { twMerge } from 'tailwind-merge'
import { Tab } from '@headlessui/react'
import { forwardRef, PropsWithChildren } from 'react'
import { Tooltip } from './Tooltip'

export type TabButtonProps = PropsWithChildren<
  React.ButtonHTMLAttributes<HTMLButtonElement>
>

const TabButtonInner = forwardRef<HTMLButtonElement, TabButtonProps>(
  (props, ref) => {
    const tabButtonClassName =
      'rounded-tl-lg rounded-tr-lg px-8 py-3 transition-colors duration-300 ui-selected:bg-white ui-not-selected:bg-ocl-blue ui-not-selected:text-white '

    return (
      <Tab
        ref={ref}
        className={twMerge(
          tabButtonClassName,
          props.className,
          props.disabled
            ? 'disabled:opacity-50'
            : 'ui-not-selected:hover:text-gray-4'
        )}
        {...props}
      >
        {props.children}
      </Tab>
    )
  }
)

export const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(
  (props, ref) => {
    if (props.disabled) {
      return (
        <Tooltip
          content={<span>[CCTP disabled text]</span>}
          wrapperClassName="inline"
        >
          <TabButtonInner {...props} ref={ref} />
        </Tooltip>
      )
    }

    return <TabButtonInner {...props} ref={ref} />
  }
)

TabButtonInner.displayName = 'TabButtonContent'
TabButton.displayName = 'TabButton'
