import { twMerge } from 'tailwind-merge'

export const panelWrapperClassnames = twMerge(
  'h-screen w-full w-screen border border-gray-dark bg-bg-gray-1 text-white',
  'sm:shadow-modal sm:h-auto sm:w-auto sm:min-w-[448px] sm:gap-3 sm:rounded'
)

export function onPopoverClose() {
  document.body.classList.remove('overflow-hidden', 'sm:overflow-visible')
}

export function onPopoverButtonClick() {
  document.body.classList.add('overflow-hidden', 'sm:overflow-visible')
}
