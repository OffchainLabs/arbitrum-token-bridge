import { twMerge } from 'tailwind-merge'

export const panelWrapperClassnames = twMerge(
  'min-h-full w-full bg-bg-gray-1 text-white border-gray-dark border transition-none w-screen',
  'lg:ml-14 lg:w-auto lg:min-w-[448px] lg:mt-1 lg:-translate-x-[71px] lg:gap-3 lg:rounded-md lg:shadow-modal'
)

export function onPopoverClose() {
  document.body.classList.remove('overflow-hidden', 'lg:overflow-auto')
}

export function onPopoverButtonClick() {
  document.body.classList.add('overflow-hidden', 'lg:overflow-auto')
}
