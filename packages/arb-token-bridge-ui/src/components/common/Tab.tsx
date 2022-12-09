import { forwardRef, PropsWithChildren } from 'react'

export type TabButtonProps = PropsWithChildren<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    selected: boolean
  }
>

export const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(
  (props, ref) => {
    const selectedClassName = props.selected
      ? 'bg-white'
      : 'bg-blue-arbitrum text-white hover:text-gray-6'

    return (
      <button
        ref={ref}
        className={`rounded-tl-lg rounded-tr-lg px-8 py-3 transition-colors duration-300 ${selectedClassName}`}
        {...props}
      >
        {props.children}
      </button>
    )
  }
)

TabButton.displayName = 'TabButton'
