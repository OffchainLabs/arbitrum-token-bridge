import { Cog6ToothIcon } from '@heroicons/react/24/outline'

import { useArbQueryParams } from '../../../hooks/useArbQueryParams'

export function SettingsToggle() {
  const [, setQueryParams] = useArbQueryParams()

  return (
    <button
      className="arb-hover flex w-full items-center gap-3 rounded-full px-6 py-3 lg:bg-dark lg:p-3"
      onClick={() => setQueryParams({ settingsOpen: true })}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-header-menu lg:h-auto lg:w-auto lg:bg-transparent">
        <Cog6ToothIcon className="text-default-black h-5 w-5 lg:h-4 lg:w-4 lg:text-white" />
      </span>
      <span className="text-2xl text-white lg:hidden">Settings</span>
    </button>
  )
}
