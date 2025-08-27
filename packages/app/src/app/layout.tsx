import type { Metadata } from 'next'
import { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import { unica } from '@/bridge/components/common/Font'

import '@/bridge/styles/tailwind.css'

export const metadata: Metadata = {
  title: 'Arbitrum Token Bridge',
  description: 'Bridge tokens between Ethereum and Arbitrum networks',
  icons: {
    icon: '/logo.png'
  }
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className={twMerge('relative flex-col bg-black', unica.variable)}>
        {children}
      </body>
    </html>
  )
}
