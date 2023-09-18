import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import React from 'react'
import { darkTheme, Theme } from '@rainbow-me/rainbowkit'
import merge from 'lodash-es/merge'

import { getProps } from '../../util/wagmi/setup'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'

const rainbowkitTheme = merge(darkTheme(), {
  colors: {
    accentColor: 'var(--blue-link)'
  },
  fonts: {
    body: "'Space Grotesk', sans-serif"
  }
} as Theme)

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [{ walletConnectChain }] = useArbQueryParams()
  // We're doing this as a workaround so users can select their preferred chain on WalletConnect.
  //
  // https://github.com/orgs/WalletConnect/discussions/2733
  // https://github.com/wagmi-dev/references/blob/main/packages/connectors/src/walletConnect.ts#L114
  const { rainbowKitProviderProps } = getProps(walletConnectChain)

  return (
    <RainbowKitProvider theme={rainbowkitTheme} {...rainbowKitProviderProps}>
      {children}
    </RainbowKitProvider>
  )
}
