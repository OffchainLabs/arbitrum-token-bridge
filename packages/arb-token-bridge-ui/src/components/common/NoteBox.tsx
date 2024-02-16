import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { PropsWithChildren, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

type NoteBoxProps = PropsWithChildren<{
  variant?: 'info' | 'warning' | 'error'
  className?: string
}>

const iconClassName = 'h-3 w-3 shrink-0 mt-[2px]'

export const NoteBox = ({
  children,
  variant = 'info',
  className
}: NoteBoxProps) => {
  const wrapperClassName = useMemo(() => {
    switch (variant) {
      case 'info':
        return 'bg-cyan text-cyan-dark'
      case 'warning':
        return 'bg-orange text-orange-dark'
      case 'error':
        return 'bg-brick text-brick-dark'
    }
  }, [variant])

  return (
    <div
      className={twMerge(
        'flex flex-row space-x-2 rounded p-2',
        wrapperClassName,
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
