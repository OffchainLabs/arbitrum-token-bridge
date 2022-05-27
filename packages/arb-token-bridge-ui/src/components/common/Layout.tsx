import React, { useMemo } from 'react'
import { InformationCircleIcon } from '@heroicons/react/solid'

import { Header } from './Header'
import { Footer } from './Footer'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import useTwitter from '../../hooks/useTwitter'

function NotificationContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex justify-center bg-black">
      <div className="w-full lg:px-8 max-w-1440px">
        <div className="w-full flex">{children}</div>
      </div>
    </div>
  )
}

function Notification({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-row items-center space-x-2 lg:w-auto py-2 px-3 lg:rounded-bl-lg lg:rounded-br-lg bg-v3-cyan lg:text-sm text-v3-cyan-dark">
      <InformationCircleIcon className="h-4 w-4" />
      {children}
    </div>
  )
}

function ArbitrumBetaNotification() {
  return (
    <Notification>
      <span>
        Arbitrum is in beta.{' '}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://developer.offchainlabs.com/docs/mainnet#some-words-of-caution"
          className=" underline"
        >
          Learn more.
        </a>
      </span>
    </Notification>
  )
}

function RinkebyTestnetNotification() {
  return (
    <Notification>
      <a
        target="_blank"
        rel="noreferrer"
        href="https://developer.offchainlabs.com/docs/mainnet#some-words-of-caution"
        className=" underline"
      >
        What is Rinkeby Testnet?
      </a>
    </Notification>
  )
}

function NitroDevnetNotification() {
  const handleTwitterClick = useTwitter()

  return (
    <Notification>
      <button onClick={handleTwitterClick} className="underline">
        Request testnet ETH from the Nitro Devnet Twitter faucet!
      </button>
    </Notification>
  )
}

type LayoutProps = {
  children: React.ReactNode
}

export function Layout(props: LayoutProps) {
  const { l1 } = useNetworksAndSigners()

  const isMainnet = useMemo(() => {
    if (typeof l1.network === 'undefined') {
      return false
    }

    return l1.network.chainID === 1
  }, [l1])

  const isRinkeby = useMemo(() => {
    if (typeof l1.network === 'undefined') {
      return false
    }

    return l1.network.chainID === 4
  }, [l1])

  const isNitro = useMemo(() => {
    if (typeof l1.network === 'undefined') {
      return false
    }

    return l1.network.chainID === 5
  }, [l1])

  return (
    <div
      style={{ backgroundImage: 'url(/images/space.jpg)' }}
      className="flex flex-col min-h-screen bg-cover bg-no-repeat"
    >
      <div>
        <Header />
        <NotificationContainer>
          {isMainnet && <ArbitrumBetaNotification />}
          {isRinkeby && <RinkebyTestnetNotification />}
          {isNitro && <NitroDevnetNotification />}
        </NotificationContainer>
      </div>

      <main className="flex-grow main-overlay lg:py-8">{props.children}</main>

      <div className="h-64" />
      <Footer />
    </div>
  )
}
