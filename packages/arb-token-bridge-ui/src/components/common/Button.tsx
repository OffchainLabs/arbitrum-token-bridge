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
const disabledClassName =
  'disabled:bg-gray-3 disabled:text-white disabled:cursor-not-allowed'

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
          disabledClassName,
          getClassNameForVariant(variant),
          customClassName
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...props}
      >
        <div
          className={`flex flex-row items-center justify-${
            props.textLeft ? 'start' : 'center'
          } space-x-3`}
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
              'absolute right-3 top-[50%] hidden translate-y-[-50%] transition-transform duration-300 md:block',
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
