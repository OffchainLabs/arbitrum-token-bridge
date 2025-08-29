import React, { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'
import EclipseBottom from '@/images/eclipse_bottom.png'

import { SiteBanner } from './SiteBanner'
import { AppSidebar } from '../Sidebar/AppSidebar'
import { Toast } from './atoms/Toast'

import { useMode } from '../../hooks/useMode'
import { unica } from './Font'

export function Layout(props: PropsWithChildren) {
  const { embedMode } = useMode()

  if (embedMode) {
    return (
      <div className={twMerge('bg-widget-background', unica.variable)}>
        {props.children}
        <Toast />
      </div>
    )
  }

  return (
    <div className={twMerge('relative flex-col bg-black', unica.variable)}>
      <Image
        src={EclipseBottom}
        alt="grains"
        className="absolute left-1/2 top-0 w-full -translate-x-1/2 rotate-180 opacity-20"
        aria-hidden
      />
      <Image
        src={EclipseBottom}
        alt="grains"
        className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 opacity-20"
        aria-hidden
      />
      <div className="relative flex flex-col sm:min-h-screen">
        <div className="relative flex flex-row">
          <AppSidebar />

          <main className="grow">
            {/* 
                Warning: DO NOT remove the `SiteBanner` component. 
                It also dynamically displays Arbiscan/Novascan status. 
                To hide or remove its content, simply empty out its children instead of removing the entire component. 
              */}
            <SiteBanner />

            {props.children}
          </main>

          <Toast />
        </div>
      </div>
    </div>
  )
}
