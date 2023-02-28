import React, { forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'
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

const defaultClassName = 'arb-hover w-max rounded-lg px-4 py-3 text-sm'
const disabledClassName = 'disabled:bg-gray-5 disabled:text-white'

type ButtonLoadingProps = Partial<{
  loaderColor: string
  loaderSize: LoaderProps['size']
}>

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: ButtonVariant
  loading?: boolean
  loadingProps?: ButtonLoadingProps
  textLeft?: true
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
    const showLoader = loading || false

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
          <span>{children}</span>
        </div>
      </button>
    )
  }
)

Button.displayName = 'Button'
