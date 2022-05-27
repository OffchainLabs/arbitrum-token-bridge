import React from 'react'

interface StatusBadgeProps {
  variant?: 'blue' | 'yellow' | 'green' | 'red'
  children: React.ReactNode
}

const variants: Record<string, string> = {
  blue: 'bg-v3-cyan text-v3-cyan-dark',
  yellow: 'bg-v3-orange text-v3-orange-dark',
  green: 'bg-v3-lime text-v3-lime-dark',
  red: 'bg-v3-brick text-v3-brick-dark'
}

export function StatusBadge({
  variant = 'blue',
  children
}: StatusBadgeProps): JSX.Element {
  return (
    <span
      className={`px-3 py-2 text-sm font-light rounded-full ${variants[variant]}`}
    >
      {children}
    </span>
  )
}
