import Tippy, { type TippyProps } from '@tippyjs/react'

export type TooltipProps = {
  show?: boolean
  children: React.ReactNode
  content?: React.ReactNode
  wrapperClassName?: string
  tippyProps?: TippyProps
  theme?: 'light' | 'dark'
}

export function Tooltip({
  show = true,
  content,
  wrapperClassName = 'w-max',
  theme = 'dark',
  tippyProps = {},
  children
}: TooltipProps): JSX.Element | null {
  if (!content) {
    return null
  }

  if (!show) {
    return <>{children}</>
  }

  return (
    <Tippy {...tippyProps} theme={theme} content={content} arrow={false}>
      <div className={wrapperClassName}>{children}</div>
    </Tippy>
  )
}
