import { XIcon } from '@heroicons/react/outline'
import { THEME_CONFIG, useTheme } from 'src/hooks/useTheme'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { classicThemeKey } from '../syncers/ThemeIncluder'
import { Checkbox } from './Checkbox'
import { Dialog } from './Dialog'

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
    <Dialog
      isOpen={isPreferencesPanelVisible}
      onClose={closePreferences}
      isCustom
    >
      <div className="flex flex-col px-8 py-4 md:max-w-[628px]">
        <div className="flex w-full flex-col items-center gap-4">
          {/* Preferences title and close button */}
          <div className="flex w-full flex-nowrap justify-between">
            <span className="text-2xl">Preferences</span>
            <XIcon
              className="h-6 w-6 cursor-pointer text-dark"
              onClick={closePreferences}
            />
          </div>
          <div className="flex w-full flex-col items-center gap-4">
            {/* Theme selection */}
            <div className="w-full">
              <div className="text-lg">Theme</div>
              <div className="flex w-full flex-col gap-2">
                {THEME_CONFIG.map(theme => (
                  <button
                    className={`flex flex-row items-center gap-2 rounded-lg bg-gray-50 p-2 text-left ${
                      theme.queryParam === selectedTheme
                        ? 'border-2 border-gray-8 bg-cyan'
                        : ''
                    }`}
                    key={theme.id}
                    onClick={() => setTheme(theme.queryParam)}
                  >
                    <input
                      type="radio"
                      id={theme.id}
                      name="theme"
                      value={theme.queryParam}
                      checked={theme.queryParam === selectedTheme}
                      className="cursor-pointer"
                    />
                    <label
                      htmlFor={theme.id}
                      className="flex cursor-pointer flex-col pl-3"
                    >
                      <span>{theme.label}</span>
                      <span className="text-xs">{theme.description}</span>
                    </label>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-4" />

            {/* Arbitrum stats */}
            <div className="w-full">
              <div className="text-lg">Stats</div>
              <button
                className="flex flex-col gap-2 rounded-lg bg-gray-50 p-2 text-left"
                onClick={
                  isArbitrumStatsVisible
                    ? closeArbitrumStats
                    : openArbitrumStats
                }
              >
                <Checkbox
                  label={
                    <span className="font-light">Show Arbitrum Stats</span>
                  }
                  checked={isArbitrumStatsVisible}
                  // on-change function applied at the parent div
                  // eslint-disable-next-line @typescript-eslint/no-empty-function
                  onChange={() => {}}
                />
                <div className="pl-[28px] text-xs">
                  Show live, nerdy stats about Ethereum and Arbitrum chains,
                  like block number, current gas price, and network activity, in
                  the bottom-right of the screen.
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
