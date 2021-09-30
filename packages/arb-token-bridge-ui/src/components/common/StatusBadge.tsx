import React from 'react'

interface StatusBadgeProps {
  variant?: 'blue' | 'yellow' | 'green' | 'red'
  children: React.ReactNode
  showDot?: boolean
}

const variants: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800'
}
const innerVariants: Record<string, string> = {
  blue: 'bg-blue-400',
  yellow: 'bg-yellow-400',
  green: 'bg-green-400',
  red: 'bg-red-400'
}

const StatusBadge = ({
  variant = 'blue',
  showDot = true,
  children
}: StatusBadgeProps): JSX.Element => {
  return (
    <span
      className={`flex items-center px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-xl ${variants[variant]}`}
    >
      {showDot && (
        <span
          className={`mr-2 w-2 h-2 rounded-full ${innerVariants[variant]}`}
        />
      )}
      {children}
    </span>
  )
}

export { StatusBadge }
