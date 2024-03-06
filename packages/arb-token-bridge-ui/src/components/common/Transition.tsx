import { Transition as HeadlessUiTransition } from '@headlessui/react'
import { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'

type TransitionSpeed = 'slow' | 'normal' | 'fast'

type TransitionOptions = {
  enterSpeed?: TransitionSpeed
  leaveSpeed?: TransitionSpeed
  unmountOnLeave?: boolean
}

type TransitionProps = PropsWithChildren<{
  isOpen?: boolean
  options?: TransitionOptions
  className?: string
  afterLeave?: () => void
}>

function getDurationClassName(speed: TransitionSpeed) {
  switch (speed) {
    case 'slow':
      return 'duration-1000'
    case 'normal':
      return 'duration-500'
    case 'fast':
      return 'duration-200'
  }
}

export const Transition = (props: TransitionProps) => {
  const { options, children, className, isOpen, afterLeave } = props

  const enterSpeed = options?.enterSpeed ?? 'fast'
  const leaveSpeed = options?.leaveSpeed ?? 'fast'
  const unmountOnLeave = options?.unmountOnLeave ?? true

  return (
    <HeadlessUiTransition
      show={isOpen}
      unmount={unmountOnLeave}
      enter={twMerge('transition ease-out', getDurationClassName(enterSpeed))}
      enterFrom="opacity-0 translate-y-1"
      enterTo="opacity-100 translate-y-0"
      leave={twMerge('transition ease-in', getDurationClassName(leaveSpeed))}
      leaveFrom="opacity-100 translate-y-0"
      leaveTo="opacity-0 translate-y-1"
      afterLeave={afterLeave}
      className={className}
    >
      {children}
    </HeadlessUiTransition>
  )
}
