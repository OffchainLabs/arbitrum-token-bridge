import { twMerge } from 'tailwind-merge'

export const PanelWrapperClassnames = twMerge(
  'fixed left-0 top-0 z-50 w-full bg-white',
  'lg:absolute lg:left-auto lg:top-auto lg:ml-14 lg:mt-1 lg:w-auto lg:min-w-[448px] lg:-translate-x-12 lg:gap-3 lg:rounded-md lg:shadow-[0px_4px_10px_0px_rgba(120,120,120,0.25)] transition-none'
)

export function onPopoverClose() {
  document.body.classList.remove('overflow-hidden', 'lg:overflow-auto')
}

export function onPopoverButtonClick() {
  document.body.classList.add('overflow-hidden', 'lg:overflow-auto')
}
