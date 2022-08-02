import { SwitchVerticalIcon } from '@heroicons/react/outline'

import { useActions, useAppState } from '../../state'

export function NetworkSwitchButton() {
  const {
    app: { isDepositMode }
  } = useAppState()
  const actions = useActions()

  return (
    <button
      onClick={() => actions.app.setIsDepositMode(!isDepositMode)}
      type="button"
      className="min-h-14 lg:min-h-16 min-w-14 lg:min-w-16 flex h-14 w-14 items-center justify-center rounded-full bg-white p-3 shadow-[0px_0px_4px_rgba(0,0,0,0.25)] transition duration-200 hover:bg-gray-2 active:mt-1 active:bg-gray-2 lg:h-16 lg:w-16"
    >
      <SwitchVerticalIcon className="text-gray-9" />
    </button>
  )
}
