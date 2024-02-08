import React from 'react'

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
  ...props
}: StatusBadgeProps): JSX.Element {
  return (
    <div
      className={`status-badge w-max rounded px-2 py-1 text-sm ${variants[variant]} flex flex-nowrap items-center gap-1`}
      {...props}
    >
      {children}
    </div>
  )
}
