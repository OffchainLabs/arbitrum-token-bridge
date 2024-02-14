import { Switch as HeadlessSwitch } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'

export type SwitchProps = {
  className?: string
  label?: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

export const Switch = ({
  className,
  label,
  description,
  checked,
  disabled,
  onChange
}: SwitchProps) => {
  return (
    <HeadlessSwitch.Group>
      <div className="toggle-switch flex flex-col">
        <div className="flex items-center gap-3">
          <HeadlessSwitch
            checked={checked}
            onChange={onChange}
            className={twMerge(
              'relative inline-flex h-4 w-8 items-center rounded-full transition-colors ui-checked:bg-white ui-not-checked:bg-gray-dark [&:disabled]:cursor-not-allowed',
              '[&_span]:ui-checked:translate-x-[20px] [&_span]:ui-checked:bg-black [&_span]:ui-not-checked:translate-x-[3px] [&_span]:ui-not-checked:bg-white',
              className
            )}
            disabled={disabled}
          >
            <span
              className={`inline-block h-[10px] w-[10px] transform rounded-full transition-transform`}
            />
          </HeadlessSwitch>

          {label && (
            <HeadlessSwitch.Label className="heading mr-4 text-sm">
              {label}
            </HeadlessSwitch.Label>
          )}
        </div>

        {description && (
          <HeadlessSwitch.Description className="mt-1 pl-11 text-sm text-gray-3">
            {description}
          </HeadlessSwitch.Description>
        )}
      </div>
    </HeadlessSwitch.Group>
  )
}
