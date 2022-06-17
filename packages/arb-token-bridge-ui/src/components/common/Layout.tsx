import React, { useMemo } from 'react'
import { InformationCircleIcon } from '@heroicons/react/solid'

import { Header } from './Header'
import { Footer } from './Footer'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import useTwitter from '../../hooks/useTwitter'

function NotificationContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full justify-center bg-black">
      <div className="max-w-1440px w-full lg:px-8">
        <div className="flex w-full">{children}</div>
      </div>
    </div>
  )
}

function Notification({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-row items-center space-x-2 bg-v3-cyan py-2 px-3 text-v3-cyan-dark lg:w-auto lg:rounded-bl-lg lg:rounded-br-lg lg:text-sm">
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
          className="arb-hover underline"
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
        className="arb-hover underline"
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
      style={{ backgroundImage: 'url(/images/space.jpeg)' }}
      className="flex min-h-screen flex-col bg-repeat"
    >
      <Header />

      <div className="min-h-screen-minus-100px bg-gradient-overlay flex flex-col lg:space-y-8">
        <NotificationContainer>
          {isMainnet && <ArbitrumBetaNotification />}
          {isRinkeby && <RinkebyTestnetNotification />}
          {isNitro && <NitroDevnetNotification />}
        </NotificationContainer>

        <main>{props.children}</main>
      </div>

      <Footer />
    </div>
  )
}
