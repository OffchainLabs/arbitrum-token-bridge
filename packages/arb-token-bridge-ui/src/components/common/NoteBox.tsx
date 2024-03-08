import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'

type NoteBoxProps = PropsWithChildren<{
  variant?: 'info' | 'warning' | 'error'
  className?: string
}>

const iconClassName = 'h-3 w-3 shrink-0 mt-[2px]'

const wrapperClassNames = {
  info: 'bg-cyan text-cyan-dark',
  warning: 'bg-orange text-orange-dark',
  error: 'bg-brick text-brick-dark'
}

export const NoteBox = ({
  children,
  variant = 'info',
  className
}: NoteBoxProps) => {
  return (
    <div
      className={twMerge(
        'flex flex-row space-x-2 rounded p-2',
        wrapperClassNames[variant],
        className
      )}
    >
      {variant === 'info' && (
        <InformationCircleIcon className={iconClassName} />
      )}
      {variant === 'warning' && (
        <ExclamationTriangleIcon className={iconClassName} />
      )}
      {variant === 'error' && <XCircleIcon className={iconClassName} />}
      <span className="text-sm font-light">{children}</span>
    </div>
  )
}
