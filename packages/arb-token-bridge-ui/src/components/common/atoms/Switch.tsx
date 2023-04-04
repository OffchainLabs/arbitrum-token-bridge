/*
  Standardized Toggle-switch 
*/

import { Switch as HeadlessSwitch } from '@headlessui/react'

export type SwitchProps = {
  label?: string
  description?: string
  checked: boolean
  onChange: () => void
}

export const Switch = ({
  label,
  description,
  checked,
  onChange
}: SwitchProps) => {
  return (
    <HeadlessSwitch.Group>
      <div className="toggle-switch flex flex-col">
        <div className="flex items-center gap-3">
          <HeadlessSwitch
            checked={checked}
            onChange={onChange}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ui-checked:bg-blue-link ui-not-checked:bg-gray-10 [&_span]:ui-checked:translate-x-6 [&_span]:ui-not-checked:translate-x-1"
          >
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
          </HeadlessSwitch>

          {label && (
            <HeadlessSwitch.Label className="heading mr-4">
              {label}
            </HeadlessSwitch.Label>
          )}
        </div>

        {description && (
          <HeadlessSwitch.Description className="pl-14 text-sm opacity-40">
            {description}
          </HeadlessSwitch.Description>
        )}
      </div>
    </HeadlessSwitch.Group>
  )
}
