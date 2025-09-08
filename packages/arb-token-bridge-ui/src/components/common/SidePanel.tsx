import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogBackdrop } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'
import { XMarkIcon } from '@heroicons/react/24/outline'

type SidePanelProps = {
  heading?: string
  isOpen: boolean
  onClose?: () => void
  children: React.ReactNode
  panelClassNameOverrides?: string
  scrollable?: boolean
  dialogWrapperClassName?: string
}

export const SidePanel = ({
  isOpen,
  heading,
  onClose,
  children,
  panelClassNameOverrides = '',
  scrollable = true,
  dialogWrapperClassName
}: SidePanelProps) => {
  const [open, setOpen] = useState(false)

  // When user refreshes the page with the panel open, the query param starts as true
  // For the transition to trigger we need to start from false, that's why we need another state
  // Otherwise it also causes the backdrop to have no opacity so it looks quite bad
  useEffect(() => {
    setOpen(isOpen)
  }, [isOpen])

  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className={twMerge(
        'fixed z-40 h-screen max-h-screen',
        dialogWrapperClassName
      )}
    >
      <DialogBackdrop
        transition
        className={twMerge(
          'fixed inset-0 bg-dark opacity-80 transition-opacity',
          'data-[closed]:opacity-0 data-[enter]:duration-200 data-[enter]:ease-out',
          'data-[leave]:duration-200 data-[leave]:ease-in'
        )}
        aria-hidden="true"
      />

      <div className="fixed inset-0 right-0 top-0 flex h-full w-full items-start justify-end">
        <Dialog.Panel
          transition
          className={twMerge(
            'side-panel flex h-full w-screen max-w-[1000px] translate-x-0 flex-col border-l border-gray-dark bg-black opacity-100 transition-[transform_opacity]',
            'data-[closed]:translate-x-full data-[closed]:opacity-0 data-[enter]:duration-200 data-[enter]:ease-out',
            'data-[leave]:duration-200 data-[leave]:ease-in',
            panelClassNameOverrides,
            scrollable && 'overflow-y-auto'
          )}
        >
          <Dialog.Title
            className={twMerge(
              'sticky top-0 z-50 mx-4 flex flex-row justify-between bg-black pt-4 text-white',
              !heading && 'pb-4'
            )}
          >
            {heading && <span className="text-2xl">{heading}</span>}
            <button
              className="arb-hover"
              onClick={handleClose}
              aria-label="Close side panel"
            >
              <XMarkIcon
                className={twMerge('h-5 w-5 text-white', !heading && 'ml-2')}
              />
            </button>
          </Dialog.Title>

          {/* Contents of the panel */}
          <div
            className={twMerge(
              'side-panel-content z-40 h-full px-4 pb-4',
              heading && 'p-4'
            )}
          >
            {children}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
