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
  scrollable?: boolean
}

export const SidePanel = ({
  isOpen,
  heading,
  onClose,
  children,
  panelClassNameOverrides = '',
  scrollable = true
}: SidePanelProps) => {
  const ANIMATION_DURATION = 300

  return (
    <Transition show={isOpen}>
      <Dialog
        open={isOpen}
        onClose={() => onClose?.()}
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
        <div className="fixed inset-0 right-0 top-0 flex h-full w-full items-start justify-end">
          {/* The heading of dialog  */}
          <Dialog.Panel
            className={twMerge(
              'side-panel flex h-full w-screen max-w-[1000px] flex-col bg-black',
              panelClassNameOverrides,
              !scrollable ? '' : 'overflow-y-auto'
            )}
          >
            <Dialog.Title className="sticky top-0 z-50 mx-4 flex flex-row justify-between border-b-[1px] border-gray-6 bg-black py-4 text-white">
              {heading && <span className="text-xl">{heading}</span>}
              <button className="arb-hover" onClick={onClose}>
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </Dialog.Title>

            {/* Contents of the panel */}
            <div className="side-panel-content z-40 h-full p-4">{children}</div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  )
}
