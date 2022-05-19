import React from 'react'

import Loader from 'react-loader-spinner'

type ButtonVariant = 'blue' | 'navy' | 'white'

const variants: Record<string, string> = {
  blue: 'bg-bright-blue text-white',
  navy: 'bg-navy text-white',
  white: 'bg-white border border-gray-300 text-gray-700'
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: React.ReactNode
  isLoading?: boolean
  className?: string
}

const Button = ({
  children,
  variant = 'blue',
  className,
  disabled,
  isLoading,
  ...props
}: ButtonProps): JSX.Element => {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex items-center justify-center rounded-md px-5 py-2.5 focus:outline-none
        ${variants[variant]} ${className}
        ${
          disabled
            ? 'bg-v3-gray-6 cursor-not-allowed'
            : 'hover:opacity-90 active:opacity-80 opacity-100 '
        }`}
      {...props}
    >
      {isLoading ? (
        <Loader type="Oval" color="rgb(45, 55, 75)" height={14} width={14} />
      ) : (
        children
      )}
    </button>
  )
}

export { Button }
