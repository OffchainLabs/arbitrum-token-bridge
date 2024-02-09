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
}>

function getDurationClassName(speed: TransitionSpeed) {
  switch (speed) {
    case 'slow':
      return 'duration-[1000ms]'
    case 'normal':
      return 'duration-500'
    default:
      return 'duration-200'
  }
}

export const Transition = (props: TransitionProps) => {
  const enterSpeed = props.options?.enterSpeed ?? 'fast'
  const leaveSpeed = props.options?.leaveSpeed ?? 'fast'
  const unmountOnLeave = props.options?.unmountOnLeave ?? true

  return (
    <HeadlessUiTransition
      show={props.isOpen}
      unmount={unmountOnLeave}
      enter={twMerge('transition ease-out', getDurationClassName(enterSpeed))}
      enterFrom="opacity-0 translate-y-1"
      enterTo="opacity-100 translate-y-0"
      leave={twMerge('transition ease-in', getDurationClassName(leaveSpeed))}
      leaveFrom="opacity-100 translate-y-0"
      leaveTo="opacity-0 translate-y-1"
      className={props.className}
    >
      {props.children}
    </HeadlessUiTransition>
  )
}
