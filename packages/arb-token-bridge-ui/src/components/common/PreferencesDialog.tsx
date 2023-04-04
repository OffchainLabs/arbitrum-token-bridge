import { THEME_CONFIG, useTheme, classicThemeKey } from 'src/hooks/useTheme'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { Switch } from './atoms/Switch'
import { SidePanel } from './SidePanel'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="heading mb-4 text-lg">{children}</div>
)

export const PreferencesDialog = () => {
  const {
    layout: { isPreferencesPanelVisible, isArbitrumStatsVisible }
  } = useAppContextState()

  const { closePreferences, openArbitrumStats, closeArbitrumStats } =
    useAppContextActions()

  const [_selectedTheme, setTheme] = useTheme()
  const selectedTheme =
    _selectedTheme === classicThemeKey ? classicThemeKey : ''

  return (
    <SidePanel
      isOpen={isPreferencesPanelVisible}
      heading="Preferences"
      onClose={closePreferences}
      overridePanelClasses="lg:!w-[600px] lg:!min-w-[100px]" // custom width
    >
      <div className="flex w-full flex-col items-center gap-4 text-white">
        {/* Theme selection */}
        <div className="w-full">
          <SectionTitle>Theme</SectionTitle>
          <div className="flex w-full flex-col gap-2">
            {THEME_CONFIG.map(theme => (
              <Switch
                key={theme.id}
                label={theme.label}
                description={theme.description}
                checked={theme.queryParam === selectedTheme}
                onChange={() => setTheme(theme.queryParam)}
              />
            ))}
          </div>
        </div>

        <div className="h-4" />

        {/* Arbitrum stats */}
        <div className="w-full">
          <SectionTitle>Stats</SectionTitle>

          <Switch
            label="Show Arbitrum Stats"
            description="Show live, nerdy stats about Ethereum and Arbitrum chains, like
        block number, current gas price, and network activity."
            checked={isArbitrumStatsVisible}
            onChange={
              isArbitrumStatsVisible ? closeArbitrumStats : openArbitrumStats
            }
          />
        </div>
      </div>
    </SidePanel>
  )
}
