import React, { Fragment } from 'react'
import { Transition as HeadlessUITransition } from '@headlessui/react'

export const transitionDefaultProps = {
  enter: 'transition ease-out duration-100',
  enterFrom: 'transform opacity-0',
  enterTo: 'transform opacity-100',
  leave: 'transition ease-in duration-75',
  leaveFrom: 'transform opacity-100',
  leaveTo: 'transform opacity-0'
}

export function Transition({ children }: { children: React.ReactNode }) {
  return (
    <HeadlessUITransition as={Fragment} {...transitionDefaultProps}>
      {children}
    </HeadlessUITransition>
  )
}
