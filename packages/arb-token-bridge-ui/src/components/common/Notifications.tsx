import { useEffect, useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/outline'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'

import { useTheme } from '../../hooks/useTheme'
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

const aprilFools = '2023-04-01'
const isAprilFools = dayjs().isSame(aprilFools, 'day')
const isAfterAprilFools = dayjs().isAfter(aprilFools, 'day')
const classicThemeKey = 'arbitrum-classic-theme'

function ToggleTheme() {
  const [theme, setTheme] = useTheme()
  const isClassicTheme = theme === classicThemeKey
  const [didSetClassicThemeOnce, setDidSetClassicThemeOnce] = useState(false)

  useEffect(() => {
    if (isAprilFools && !didSetClassicThemeOnce) {
      setTheme(classicThemeKey)
      setDidSetClassicThemeOnce(true)
    }
  }, [didSetClassicThemeOnce, setTheme])

  const handleToggleTheme = () => {
    if (isClassicTheme) {
      setTheme('')
    } else {
      setTheme(classicThemeKey)
    }
  }

  return (
    <>
      {/* show rick-rolling only on april fools day and in fun-theme */}
      {isAprilFools && isClassicTheme && (
        <Notification>
          <a
            href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            rel="noreferrer"
            target="_blank"
          >
            🔥 Sign up for Secret ALPHA
          </a>
        </Notification>
      )}

      {/* show toggle theme button on april fool and after that */}
      {(isAprilFools || isAfterAprilFools) && (
        <Notification>
          <button onClick={handleToggleTheme} className="arb-hover text-left">
            {isClassicTheme
              ? 'Back to normal'
              : '💙🧡 Arbitrum: before it was cool'}
          </button>
        </Notification>
      )}

      {/* show fun stuff only on april fools day in fun-theme */}
      {isAprilFools && isClassicTheme && <FunStuff />}
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
