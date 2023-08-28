import { useCallback, useEffect } from 'react'
import { useChainId } from 'wagmi'
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

export const testnetModeLocalStorageKey = 'arbitrum:bridge:settings:testnetMode'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="heading mb-4 text-lg">{children}</div>
)

export const SettingsDialog = () => {
  const chainId = useChainId()
  const isConnectedToTestnet = isNetwork(chainId).isTestnet

  const [{ settingsOpen }, setQueryParams] = useArbQueryParams()

  const [isArbitrumStatsVisible, setIsArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)
  const [isTestnetMode, setIsTestnetMode] = useLocalStorage<boolean>(
    testnetModeLocalStorageKey
  )

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
            isConnectedToTestnet ? 'pointer-events-none' : ''
          )}
        >
          <SectionTitle>Developer Mode</SectionTitle>

          <Switch
            label="Turn on testnet mode"
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
          <SectionTitle>Add Testnet Orbit Chain</SectionTitle>

          <AddCustomChain />
        </div>
      </div>
    </SidePanel>
  )
}
