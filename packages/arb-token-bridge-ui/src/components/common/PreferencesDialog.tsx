import { THEME_CONFIG, useTheme, classicThemeKey } from 'src/hooks/useTheme'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { Radio } from './atoms/Radio'
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
      overridePanelClasses="lg:!w-[600px] !min-w-[350px]" // custom width
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
                value: theme.queryParam,
                id: theme.id
              }))}
            />
          </div>
        </div>

        {/* Arbitrum stats toggle */}
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
