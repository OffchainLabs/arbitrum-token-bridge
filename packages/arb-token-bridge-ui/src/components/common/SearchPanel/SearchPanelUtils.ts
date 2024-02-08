import { twMerge } from 'tailwind-merge'

export const panelWrapperClassnames = twMerge(
  'fixed left-0 top-0 z-50 w-full bg-bg-gray-1 text-white border-gray-dark border',
  'lg:absolute lg:left-auto lg:top-auto lg:ml-14 lg:mt-1 lg:w-auto lg:min-w-[448px] lg:-translate-x-12 lg:gap-3 lg:rounded-md lg:shadow-modal transition-none'
)

export function onPopoverClose() {
  document.body.classList.remove('overflow-hidden', 'lg:overflow-auto')
}

export function onPopoverButtonClick() {
  document.body.classList.add('overflow-hidden', 'lg:overflow-auto')
}
