import { Switch as HeadlessSwitch } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'

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
        <div className="flex items-center gap-2">
          <HeadlessSwitch
            checked={checked}
            onChange={onChange}
            className="relative inline-flex h-3 w-6 items-center rounded-full transition-colors ui-checked:bg-white ui-not-checked:bg-gray-dark [&_span]:bg-black [&_span]:ui-checked:translate-x-[17px] [&_span]:ui-not-checked:translate-x-[3px]"
          >
            <span className="inline-block h-[10px] w-[10px] transform rounded-full transition-transform" />
          </HeadlessSwitch>

          {label && (
            <HeadlessSwitch.Label
              className={twMerge(
                'heading mr-4 cursor-pointer text-sm transition',
                checked ? 'text-white' : 'text-gray-dark'
              )}
            >
              {label}
            </HeadlessSwitch.Label>
          )}
        </div>
        {description && (
          <HeadlessSwitch.Description
            className={twMerge(
              'mt-1 pl-8 text-sm transition',
              checked ? 'text-white' : 'text-gray-dark'
            )}
          >
            {description}
          </HeadlessSwitch.Description>
        )}
      </div>
    </HeadlessSwitch.Group>
  )
}
