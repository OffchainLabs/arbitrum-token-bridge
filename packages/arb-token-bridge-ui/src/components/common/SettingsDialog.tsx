import { twMerge } from 'tailwind-merge'
import useLocalStorage from '@rehooks/local-storage'

import { statsLocalStorageKey } from '../MainContent/ArbitrumStats'
import { AddCustomChain } from './AddCustomChain'
import { Switch } from './atoms/Switch'
import { SidePanel } from './SidePanel'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { ExternalLink } from './ExternalLink'
import { ORBIT_QUICKSTART_LINK } from '../../constants'

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
  const [{ settingsOpen }, setQueryParams] = useArbQueryParams()

  const [isArbitrumStatsVisible, setIsArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)

  const openArbitrumStats = () => {
    setIsArbitrumStatsVisible(true)
  }

  const closeArbitrumStats = () => {
    setIsArbitrumStatsVisible(false)
  }

  function closeSettings() {
    setQueryParams({ settingsOpen: false })
  }

  return (
    <SidePanel
      isOpen={settingsOpen}
      heading="Settings"
      onClose={closeSettings}
      dialogWrapperClassName="z-[1001]"
      panelClassNameOverrides="lg:!w-[944px] !min-w-[350px]" // custom width
    >
      <div className="flex w-full flex-col items-center gap-6 text-white">
        {/* Arbitrum stats toggle */}
        <div className="w-full">
          <SectionTitle>Stats</SectionTitle>

          <Switch
            label="Show Network Stats"
            description="Live, nerdy stats about Ethereum and Arbitrum chains, like
        block number and current gas price."
            checked={!!isArbitrumStatsVisible}
            onChange={
              isArbitrumStatsVisible ? closeArbitrumStats : openArbitrumStats
            }
          />
        </div>

        {/* Add custom chain */}
        <div className="w-full transition-opacity">
          <SectionTitle className="mb-1">Add Custom Orbit Chain</SectionTitle>
          <p className="mb-4 text-sm">
            Add in your own Orbit chain to the bridge. This will only be for
            local testing, other users will not see it.
            <br />
            Learn more about how to create and add your Orbit Testnet in{' '}
            <ExternalLink
              className="arb-hover underline"
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
