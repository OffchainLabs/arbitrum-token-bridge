// wip

import { Popover as HeadlessPopover } from '@headlessui/react'

export const Popover = ({}) => {
  return (
    <HeadlessPopover className="h-full">
      <HeadlessPopover.Button
        className="arb-hover h-full w-max rounded-tl-xl rounded-bl-xl bg-white px-3 hover:bg-gray-2"
        aria-label="Select Token"
      >
        {/* Button div */}
      </HeadlessPopover.Button>
      <HeadlessPopover.Panel className="absolute top-0 left-0 z-50 h-full w-full bg-white px-6 py-4 lg:left-auto lg:top-auto lg:h-auto lg:w-[466px] lg:rounded-lg lg:p-6 lg:shadow-[0px_4px_12px_#9e9e9e]">
        {({ close }) => <></>}
      </HeadlessPopover.Panel>
    </HeadlessPopover>
  )
}
