import { twMerge } from 'tailwind-merge'

export const panelWrapperClassnames = twMerge(
  'h-screen w-full bg-bg-gray-1 text-white border-gray-dark border w-screen',
  'lg:h-auto lg:w-auto lg:min-w-[448px] lg:gap-3 lg:rounded lg:shadow-modal'
)

export function onPopoverClose() {
  document.body.classList.remove('overflow-hidden', 'lg:overflow-auto')
}

export function onPopoverButtonClick() {
  document.body.classList.add('overflow-hidden', 'lg:overflow-auto')
}
