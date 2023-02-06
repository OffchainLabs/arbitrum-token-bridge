import { Dialog } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline'
import { Transition } from './Transition'

type SidePanelProps = {
  heading: string
  isOpen: boolean
  onClose?: () => void
  children: React.ReactNode
}

export const SidePanel = ({
  isOpen,
  heading,
  onClose,
  children
}: SidePanelProps) => {
  return (
    <Transition show={isOpen} duration="normal">
      <Dialog open={isOpen} onClose={() => onClose?.()} className="fixed z-50">
        {/* The backdrop, rendered as a fixed sibling to the panel container */}
        <div className="fixed inset-0 bg-dark opacity-70" aria-hidden="true" />

        {/* Full-screen container to center the panel */}
        <div className="fixed inset-0 top-0 right-0 flex h-full w-full items-start justify-end overflow-y-auto">
          {/* The heading of dialog  */}
          <Dialog.Panel className="flex h-full w-full flex-col bg-dark lg:w-1/2 lg:min-w-[700px]">
            <Dialog.Title className="sticky top-0 z-50 mx-4 flex flex-row justify-between border-b-[1px] border-gray-9 bg-dark py-4 text-white">
              <span className="text-xl">{heading}</span>
              <button className="arb-hover" onClick={onClose}>
                <XIcon className="h-6 w-6 text-white" />
              </button>
            </Dialog.Title>

            {/* Contents of the panel */}
            <div className="z-40 h-full overflow-auto p-4">{children}</div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  )
}
