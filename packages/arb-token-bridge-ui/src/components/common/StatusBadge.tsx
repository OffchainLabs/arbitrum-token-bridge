import React from 'react'
import { twMerge } from 'tailwind-merge'

export type StatusBadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'blue' | 'yellow' | 'green' | 'red' | 'gray'
}

const variants: Record<string, string> = {
  blue: 'bg-cyan text-cyan-dark',
  yellow: 'bg-orange text-orange-dark border-orange-dark border',
  green: 'bg-lime text-lime-dark',
  red: 'bg-brick text-brick-dark border border-brick-dark',
  gray: 'bg-gray-3 text-gray-dark'
}

export function StatusBadge({
  variant = 'blue',
  children,
  className,
  ...props
}: StatusBadgeProps): JSX.Element {
  return (
    <div
      className={twMerge(
        'status-badge flex w-max flex-nowrap items-center gap-1 rounded py-1 pl-1 pr-2 text-sm font-normal',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
