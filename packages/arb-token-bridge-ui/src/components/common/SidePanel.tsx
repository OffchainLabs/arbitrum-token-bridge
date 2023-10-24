import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'
import { XMarkIcon } from '@heroicons/react/24/outline'

import { Transition } from '@headlessui/react'

type SidePanelProps = {
  heading: string
  isOpen: boolean
  onClose?: () => void
  children: React.ReactNode
  panelClassNameOverrides?: string
}

export const SidePanel = ({
  isOpen,
  heading,
  onClose,
  children,
  panelClassNameOverrides = ''
}: SidePanelProps) => {
  const ANIMATION_DURATION = 300

  const [isClosing, setIsClosing] = useState(false)
  const [isAnimating, setIsAnimating] = useState(true)

  const handleOnClose = () => {
    setIsClosing(true)
    onClose?.()
    setTimeout(() => {
      setIsClosing(false)
    }, ANIMATION_DURATION) // Matches the transition duration
  }

  return (
    <Transition show={isOpen && !isClosing}>
      <Dialog
        open={isOpen || isClosing}
        onClose={handleOnClose}
        className="fixed z-50 h-screen max-h-screen"
      >
        {/* The backdrop, rendered as a fixed sibling to the panel container */}
        <Transition.Child
          enter={`transition-opacity duration-${ANIMATION_DURATION}`}
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave={`transition-opacity duration-${ANIMATION_DURATION}`}
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="h-full"
        >
          <div
            className="fixed inset-0 bg-dark opacity-80"
            aria-hidden="true"
          />
        </Transition.Child>

        {/* Full-screen container to center the panel */}
        <div
          className={twMerge(
            'fixed inset-0 right-0 top-0 flex h-full w-full items-start justify-end',
            // we don't apply scroll behavior when animating as it has side effects
            isAnimating ? '' : 'overflow-y-auto'
          )}
        >
          {/* The heading of dialog  */}
          <Transition.Child
            onAnimationStart={() => setIsAnimating(true)}
            onAnimationEnd={() => setIsAnimating(false)}
            enter={`transition-transform duration-${ANIMATION_DURATION}`}
            enterFrom="transform translate-x-full"
            enterTo="transform translate-x-0"
            leave={`transition-transform duration-${ANIMATION_DURATION}`}
            leaveFrom="transform translate-x-0"
            leaveTo="transform translate-x-full"
            className="h-full"
          >
            <Dialog.Panel
              className={twMerge(
                'side-panel flex h-full w-full flex-col bg-black lg:w-1/2 lg:min-w-[1000px]',
                panelClassNameOverrides
              )}
            >
              <Dialog.Title className="sticky top-0 z-50 mx-4 flex flex-row justify-between border-b-[1px] border-gray-6 bg-black py-4 text-white">
                {heading && <span className="text-xl">{heading}</span>}
                <button className="arb-hover" onClick={onClose}>
                  <XMarkIcon className="h-6 w-6 text-white" />
                </button>
              </Dialog.Title>

              {/* Contents of the panel */}
              <div className="side-panel-content z-40 h-full p-4">
                {children}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
