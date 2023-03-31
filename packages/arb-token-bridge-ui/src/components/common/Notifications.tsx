import { InformationCircleIcon } from '@heroicons/react/outline'
import { twMerge } from 'tailwind-merge'

import { useTheme } from 'src/hooks/useTheme'
import { ExternalLink } from '../common/ExternalLink'
import { isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import useTwitter from '../../hooks/useTwitter'
import { FunStuff } from './FunStuff'

function NotificationContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 flex w-full justify-center bg-black lg:mb-6">
      <div className="w-full max-w-[1440px] lg:px-8">
        <div className="flex w-full flex-wrap gap-2">{children}</div>
      </div>
    </div>
  )
}

function Notification({
  infoIcon,
  children,
  mode = 'dark'
}: {
  infoIcon?: boolean
  mode?: 'light' | 'dark'
  children: React.ReactNode
}) {
  return (
    <div
      className={twMerge(
        'mx-2 flex w-auto gap-2 rounded-md p-2 px-4 text-sm',
        mode === 'light' ? 'bg-cyan text-dark' : 'bg-dark text-cyan'
      )}
    >
      {infoIcon && (
        <InformationCircleIcon
          className="inline-block h-5 w-5 text-gray-10"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  )
}

function ToggleTheme() {
  const { setTheme, classicThemeKey, isClassicTheme } = useTheme()

  const handleToggleTheme = () => {
    if (isClassicTheme) {
      setTheme('')
    } else {
      setTheme(classicThemeKey)
    }
  }

  return (
    <>
      {isClassicTheme && (
        <Notification>
          <a
            href="https://youtu.be/uHgt8giw1LY"
            rel="noreferrer"
            target="_blank"
          >
            🔥 Sign up for Secret ALPHA
          </a>
        </Notification>
      )}
      <Notification>
        <button onClick={handleToggleTheme} className="arb-hover text-left">
          {isClassicTheme
            ? 'Back to normal'
            : '💙🧡 Arbitrum: before it was cool'}
        </button>
      </Notification>

      {isClassicTheme && <FunStuff />}
    </>
  )
}

function NitroDevnetNotification() {
  const handleTwitterClick = useTwitter()

  return (
    <>
      <Notification infoIcon>
        <ExternalLink
          href="https://consensys.zendesk.com/hc/en-us/articles/7277996058395"
          className="arb-hover"
        >
          What is Nitro Testnet?
        </ExternalLink>
      </Notification>
      <Notification>
        <button onClick={handleTwitterClick} className="arb-hover text-left">
          Request ETH from the Nitro Testnet Twitter faucet!
        </button>
      </Notification>
    </>
  )
}

export function Notifications() {
  const { l1 } = useNetworksAndSigners()
  const { isGoerli } = isNetwork(l1.network.chainID)

  return (
    <NotificationContainer>
      {isGoerli && <NitroDevnetNotification />}
      <ToggleTheme />
    </NotificationContainer>
  )
}
