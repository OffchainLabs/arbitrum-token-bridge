import React from 'react'

import Loader from 'react-loader-spinner'

type ButtonSize = 'sm' | 'md'
type ButtonVariant = 'blue' | 'navy' | 'white'

const variants: Record<string, string> = {
  blue: 'bg-bright-blue text-white',
  navy: 'bg-navy text-white',
  white: 'bg-white border border-gray-300 text-gray-700'
}

const sizeVariants: Record<string, string> = {
  md: 'text-base leading-6 font-medium h-10',
  sm: 'text-sm leading-5 font-medium h-8'
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
  isLoading?: boolean
  className?: string
}

const Button = ({
  children,
  variant = 'blue',
  size = 'md',
  className,
  disabled,
  isLoading,
  ...props
}: ButtonProps): JSX.Element => {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex items-center justify-center shadow-sm rounded-md px-5 py-2.5 focus:outline-none 
        ${className} ${variants[variant]} ${sizeVariants[size]} 
        ${
          disabled
            ? ' opacity-50 '
            : ' hover:opacity-90 active:opacity-80 opacity-100 '
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
