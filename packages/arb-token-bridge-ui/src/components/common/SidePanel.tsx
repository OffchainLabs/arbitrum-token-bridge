import { XIcon } from '@heroicons/react/outline'

type SidePanelProps = {
  heading: string
  onClose?: () => void
  children: React.ReactNode
}

export const SidePanel = ({ heading, onClose, children }: SidePanelProps) => {
  return (
    <div className="border-1 fixed right-0 top-0 z-50 h-full w-full overflow-scroll border-white bg-dark p-4 text-white lg:w-2/4">
      {/* Header */}
      <div className="sticky top-0 z-50 flex flex-row justify-between space-y-1 px-4 py-2 lg:px-0 lg:py-0 lg:pb-2">
        <span className="text-xl">{heading}</span>

        <button className="arb-hover" onClick={onClose}>
          <XIcon className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Divider */}
      <div className="m-2 h-1 w-full border-b-[1px] border-gray-9" />

      {/* Content */}
      {children}
    </div>
  )
}
