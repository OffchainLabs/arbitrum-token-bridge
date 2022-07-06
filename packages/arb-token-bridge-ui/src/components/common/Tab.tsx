import { forwardRef } from 'react'

export type TabButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean
}

export const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(
  (props, ref) => {
    const selectedClassName = props.selected
      ? 'rounded-tl-lg rounded-tr-lg bg-white'
      : 'bg-blue-arbitrum text-white'

    return (
      <button
        ref={ref}
        className={`arb-hover px-8 py-3 ${selectedClassName}`}
        {...props}
      >
        {props.children}
      </button>
    )
  }
)
