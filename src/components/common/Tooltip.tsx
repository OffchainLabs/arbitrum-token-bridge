import Tippy from '@tippyjs/react'

export type TooltipProps = {
  show?: boolean
  children: React.ReactNode
  content?: React.ReactNode
  wrapperClassName?: string
  theme?: 'light' | 'dark'
}

export function Tooltip({
  show = true,
  content,
  wrapperClassName = 'w-max',
  theme = 'light',
  children
}: TooltipProps): JSX.Element {
  if (!show) {
    return <>{children}</>
  }

  return (
    <Tippy theme={theme} content={content}>
      <div className={wrapperClassName}>{children}</div>
    </Tippy>
  )
}
