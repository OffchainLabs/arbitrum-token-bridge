import React from 'react'

export type StatusBadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'blue' | 'yellow' | 'green' | 'red'
}

const variants: Record<string, string> = {
  blue: 'bg-cyan text-cyan-dark border border-cyan-dark',
  yellow: 'bg-orange text-orange-dark border border-orange-dark',
  green: 'bg-lime text-lime-dark border border-lime-dark',
  red: 'bg-brick text-brick-dark border border-brick-dark'
}

export function StatusBadge({
  variant = 'blue',
  children,
  ...props
}: StatusBadgeProps): JSX.Element {
  return (
    <div
      className={`w-max rounded-full px-3 py-1 text-sm ${variants[variant]}`}
      {...props}
    >
      {children}
    </div>
  )
}
