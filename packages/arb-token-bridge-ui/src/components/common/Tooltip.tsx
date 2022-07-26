import Tippy from '@tippyjs/react'

export type TooltipProps = {
  show?: boolean
  children: React.ReactNode
  content?: React.ReactNode
}

export function Tooltip({
  show = true,
  content,
  children
}: TooltipProps): JSX.Element {
  if (!show) {
    return <>{children}</>
  }

  return (
    <Tippy theme="light" content={content}>
      <div className="w-max">{children}</div>
    </Tippy>
  )
}
