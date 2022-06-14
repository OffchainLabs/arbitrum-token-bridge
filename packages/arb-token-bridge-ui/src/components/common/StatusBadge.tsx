import React from 'react'

interface StatusBadgeProps {
  variant?: 'blue' | 'yellow' | 'green' | 'red'
  children: React.ReactNode
}

const variants: Record<string, string> = {
  blue: 'bg-v3-cyan text-v3-cyan-dark border border-v3-cyan-dark',
  yellow: 'bg-v3-orange text-v3-orange-dark border border-v3-orange-dark',
  green: 'bg-v3-lime text-v3-lime-dark border border-v3-lime-dark',
  red: 'bg-v3-brick text-v3-brick-dark border border-v3-brick-dark'
}

export function StatusBadge({
  variant = 'blue',
  children
}: StatusBadgeProps): JSX.Element {
  return (
    <div
      className={`w-max rounded-full px-3 py-1 text-sm ${variants[variant]}`}
    >
      {children}
    </div>
  )
}
