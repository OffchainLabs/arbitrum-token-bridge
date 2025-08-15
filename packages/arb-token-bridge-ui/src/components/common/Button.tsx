import React, { forwardRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

import { Loader, LoaderProps } from './atoms/Loader'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary'

function getClassNameForVariant(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return 'border-dark'

    case 'secondary':
      return 'hover:(not:disabled):opacity-70 active:(not:disabled):opacity-80 arb-hover flex w-max flex-nowrap items-center gap-1 rounded border border-white/20 px-[12px] py-[8px] text-sm text-white outline-none hover:bg-white/10 bg-transparent'

    case 'tertiary':
      return 'bg-transparent border-transparent text-white disabled:border-none disabled:bg-transparent'
  }
}

type ButtonLoadingProps = Partial<{
  loaderColor: string
  loaderSize: LoaderProps['size']
}>

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: ButtonVariant
  loading?: boolean
  loadingProps?: ButtonLoadingProps
  textLeft?: boolean
  showArrow?: boolean
  truncate?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      loading,
      loadingProps,
      disabled,
      className: customClassName,
      children,
      ...props
    },
    ref
  ) => {
    const [hovered, setHovered] = useState(false)

    const showLoader = loading || false
    const truncate = props.truncate ?? true

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={twMerge(
          'arb-hover relative w-max rounded border bg-dark p-2 text-sm',
          'text-white disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/10 disabled:text-white/50',
          getClassNameForVariant(variant),
          customClassName
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...props}
      >
        <div
          className={twMerge(
            'flex flex-row items-center space-x-3',
            props.textLeft ? 'justify-start' : 'justify-center',
            props.showArrow && 'pr-4'
          )}
        >
          {showLoader && (
            <Loader
              color={loadingProps?.loaderColor || 'white'}
              size={loadingProps?.loaderSize || 'small'}
            />
          )}
          <span className={twMerge(truncate && 'truncate')}>{children}</span>
        </div>
        {props.showArrow && (
          <ArrowRightIcon
            className={twMerge(
              'absolute right-3 top-[50%] translate-y-[-50%] transition-transform duration-300',
              hovered && 'translate-x-[3px]'
            )}
            width={16}
          />
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
