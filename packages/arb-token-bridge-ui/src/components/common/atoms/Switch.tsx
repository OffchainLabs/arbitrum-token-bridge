import { Switch as HeadlessSwitch } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'

export type SwitchProps = {
  className?: string
  label?: string
  description?: string
  name?: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

export const Switch = ({
  className,
  label,
  description,
  name,
  checked,
  disabled,
  onChange
}: SwitchProps) => {
  return (
    <HeadlessSwitch.Group>
      <div className="toggle-switch flex flex-col text-white/70 duration-200 hover:text-white">
        <div className="flex items-center gap-3">
          <HeadlessSwitch
            checked={checked}
            onChange={onChange}
            className={twMerge(
              'ui-checked:bg-white ui-not-checked:bg-white/50 relative inline-flex h-3 w-7 items-center rounded-full transition-colors [&:disabled]:cursor-not-allowed',
              '[&_span]:ui-checked:translate-x-[22px] [&_span]:ui-not-checked:translate-x-[3px] [&~*]:ui-checked:text-white duration-200 [&_span]:bg-black',
              className
            )}
            disabled={disabled}
            aria-label={name}
          >
            <span className="inline-block h-[10px] w-[10px] transform rounded-full transition-transform" />
          </HeadlessSwitch>

          {label && (
            <HeadlessSwitch.Label
              className={twMerge('heading mr-4 cursor-pointer text-sm')}
            >
              {label}
            </HeadlessSwitch.Label>
          )}
        </div>
        {description && (
          <HeadlessSwitch.Description className="mt-1 pl-10 text-sm text-white/70">
            {description}
          </HeadlessSwitch.Description>
        )}
      </div>
    </HeadlessSwitch.Group>
  )
}
