import React, { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  backgroundImageSrc?: string
}

export function Layout(props: LayoutProps) {
  return (
    <div
      style={{ backgroundImage: props.backgroundImageSrc }}
      className="relative flex min-h-screen flex-col overflow-hidden bg-repeat"
    >
      {props.header}

      <div className="bg-gradient-overlay z-20 flex min-h-[calc(100vh-80px)] flex-col">
        <main>{props.children}</main>
      </div>

      {props.footer}
    </div>
  )
}
