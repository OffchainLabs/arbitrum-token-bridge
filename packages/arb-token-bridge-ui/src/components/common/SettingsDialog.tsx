import { useCallback, useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import useLocalStorage from '@rehooks/local-storage'

import { THEME_CONFIG, useTheme, classicThemeKey } from '../../hooks/useTheme'
import { statsLocalStorageKey } from '../MainContent/ArbitrumStats'
import { AddCustomChain } from './AddCustomChain'
import { Radio } from './atoms/Radio'
import { Switch } from './atoms/Switch'
import { SidePanel } from './SidePanel'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { isNetwork } from '../../util/networks'
import { warningToast } from './atoms/Toast'
import { ExternalLink } from './ExternalLink'
import { ORBIT_QUICKSTART_LINK } from '../../constants'
import { useNetworks } from '../../hooks/useNetworks'

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'

const SectionTitle = ({
  className,
  children
}: {
  className?: string
  children: React.ReactNode
}) => (
  <div className={twMerge('heading mb-4 text-lg', className)}>{children}</div>
)

export const SettingsDialog = () => {
  const [{ sourceChain }] = useNetworks()

  const isConnectedToTestnet = isNetwork(sourceChain.id).isTestnet

  const [{ settingsOpen }, setQueryParams] = useArbQueryParams()

  const [isArbitrumStatsVisible, setIsArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)
  const [isTestnetMode, setIsTestnetMode] = useIsTestnetMode()

  const [_selectedTheme, setTheme] = useTheme()
  const selectedTheme =
    _selectedTheme === classicThemeKey ? classicThemeKey : 'space'

  const openArbitrumStats = () => {
    setIsArbitrumStatsVisible(true)
  }

  const closeArbitrumStats = () => {
    setIsArbitrumStatsVisible(false)
  }

  const enableTestnetMode = useCallback(() => {
    setIsTestnetMode(true)
  }, [setIsTestnetMode])

  const disableTestnetMode = useCallback(() => {
    // can't turn test mode off if connected to testnet
    if (!isConnectedToTestnet) {
      setIsTestnetMode(false)
    } else {
      warningToast(
        'Cannot disable Testnet mode while connected to a testnet network'
      )
    }
  }, [isConnectedToTestnet, setIsTestnetMode])

  function closeSettings() {
    setQueryParams({ settingsOpen: false })
  }

  useEffect(() => {
    // force test mode if connected to testnet
    if (isConnectedToTestnet) {
      enableTestnetMode()
    }
  }, [isConnectedToTestnet, enableTestnetMode])

  return (
    <SidePanel
      isOpen={settingsOpen}
      heading="Settings"
      onClose={closeSettings}
      panelClassNameOverrides="lg:!w-[600px] !min-w-[350px]" // custom width
    >
      <div className="flex w-full flex-col items-center gap-8 text-white">
        {/* Theme selection radio */}
        <div className="w-full">
          <SectionTitle>Theme</SectionTitle>
          <div className="flex w-full flex-col gap-2">
            <Radio
              orientation="vertical"
              value={selectedTheme}
              onChange={setTheme}
              options={THEME_CONFIG.map(theme => ({
                label: theme.label,
                description: theme.description,
                value: theme.id,
                id: theme.id
              }))}
            />
          </div>
        </div>

        {/* Arbitrum stats toggle */}
        <div className="w-full">
          <SectionTitle>Stats</SectionTitle>

          <Switch
            label="Show Network Stats"
            description="Show live, nerdy stats about Ethereum and Arbitrum chains, like
        block number and current gas price."
            checked={!!isArbitrumStatsVisible}
            onChange={
              isArbitrumStatsVisible ? closeArbitrumStats : openArbitrumStats
            }
          />
        </div>

        {/* Show testnets toggle */}
        <div
          className={twMerge(
            'w-full',
            isConnectedToTestnet ? 'cursor-not-allowed opacity-20' : ''
          )}
        >
          <SectionTitle>Developer Mode</SectionTitle>

          <Switch
            label="Turn on Testnet mode"
            description="Show testnet networks and enable other testnet features."
            checked={!!isTestnetMode}
            onChange={isTestnetMode ? disableTestnetMode : enableTestnetMode}
          />
        </div>

        {/* Add custom chain */}
        <div
          className={twMerge(
            'w-full',
            isTestnetMode ? '' : 'pointer-events-none opacity-20'
          )}
        >
          <SectionTitle className="mb-1">Add Testnet Orbit Chain</SectionTitle>
          <p className="mb-4 text-sm text-gray-3">
            Add in your own Orbit Testnet to the bridge. This will only be for
            local testing. Learn more about how to create and add your Orbit
            Testnet to the bridge in{' '}
            <ExternalLink
              className="arb-hover text-blue-400 underline"
              href={ORBIT_QUICKSTART_LINK}
            >
              Arbitrum Orbit Quickstart
            </ExternalLink>
            .
          </p>

          <AddCustomChain />
        </div>
      </div>
    </SidePanel>
  )
}
