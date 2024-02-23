import React, { forwardRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

import { Loader, LoaderProps } from './atoms/Loader'

type ButtonVariant = 'primary' | 'secondary'

function getClassNameForVariant(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return 'bg-dark text-white'

    case 'secondary':
      return 'bg-transparent text-dark'
  }
}

const defaultClassName = 'relative arb-hover w-max rounded p-2 text-sm'

type ButtonLoadingProps = Partial<{
  loaderColor: string
  loaderSize: LoaderProps['size']
}>

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: ButtonVariant
  loading?: boolean
  loadingProps?: ButtonLoadingProps
  textLeft?: true
  showArrow?: true
  truncate?: false
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      loading,
      loadingProps,
      // eslint-disable-next-line react/prop-types
      disabled,
      // eslint-disable-next-line react/prop-types
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
          defaultClassName,
          'disabled:cursor-not-allowed disabled:opacity-50',
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
