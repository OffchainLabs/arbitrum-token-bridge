import { Switch } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

export type CheckboxProps = {
  label: string | React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  labelClassName?: string
}

export function Checkbox({ labelClassName, label, ...props }: CheckboxProps) {
  return (
    <Switch.Group
      as="div"
      className="arb-hover flex flex-row items-center space-x-1"
    >
      <Switch
        {...props}
        className={twMerge(
          'h-3 w-3 flex-shrink-0 rounded-sm transition duration-200 ease-in-out',
          props.checked
            ? 'border-dark border bg-white'
            : 'bg-dark border border-white'
        )}
      >
        <CheckIcon className="stroke-5 text-dark ml-[2px] mt-[1px] h-2 w-2" />
      </Switch>
      <Switch.Label
        className={twMerge(
          'cursor-pointer',
          labelClassName,
          props.checked ? 'text-white' : 'text-gray-3'
        )}
      >
        {label}
      </Switch.Label>
    </Switch.Group>
  )
}
