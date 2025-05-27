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
            ? 'border border-dark bg-white'
            : 'border border-white bg-dark'
        )}
      >
        <CheckIcon className="mt-[1px] ml-[2px] h-2 w-2 stroke-5 text-dark" />
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
