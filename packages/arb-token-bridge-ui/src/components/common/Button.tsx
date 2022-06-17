import React, { forwardRef } from 'react'
import Loader from 'react-loader-spinner'
import { twMerge } from 'tailwind-merge'

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
  loaderWidth: string
  loaderHeight: string
}>

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: ButtonVariant
  loading?: boolean
  loadingProps?: ButtonLoadingProps
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
        <div className="flex flex-row items-center justify-center space-x-3">
          {showLoader && (
            <Loader
              type="TailSpin"
              color={loadingProps?.loaderColor || 'white'}
              width={loadingProps?.loaderWidth || 16}
              height={loadingProps?.loaderHeight || 16}
            />
          )}
          <span>{children}</span>
        </div>
      </button>
    )
  }
)
