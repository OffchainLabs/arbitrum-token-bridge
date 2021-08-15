import React, { HTMLProps } from 'react'

type ButtonSize = 'sm' | 'md'
type ButtonVariant = 'blue' | 'white'

const variants: Record<string, string> = {
  blue: 'bg-bright-blue text-white',
  white: 'bg-white border border-gray-300 text-gray-700'
}

const sizeVariants: Record<string, string> = {
  md: 'text-base leading-6 font-medium',
  sm: 'text-sm leading-5 font-medium'
}
const Button = ({
  children,
  variant = 'blue',
  size = 'md',
  className,
  ...props
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  children: string
  className?: string
  props?: HTMLProps<HTMLButtonElement>
}): JSX.Element => {
  return (
    <button
      type="button"
      className={`flex items-center justify-center shadow-sm rounded-md px-5 py-2.5 ${className} ${variants[variant]} ${sizeVariants[size]}`}
      {...props}
    >
      {children}
    </button>
  )
}

export { Button }
