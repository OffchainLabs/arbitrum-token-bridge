import { Switch } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

export type CheckboxProps = {
  label: string | React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Checkbox(props: CheckboxProps) {
  return (
    <Switch.Group
      as="div"
      className="arb-hover flex flex-row items-start space-x-1"
    >
      <Switch
        {...props}
        className={twMerge(
          'mt-[4px] h-3 w-3 flex-shrink-0 rounded-sm transition duration-200 ease-in-out',
          props.checked
            ? 'border border-dark bg-white'
            : 'border border-white bg-dark'
        )}
      >
        <CheckIcon className="ml-[2px] mt-[1px] h-2 w-2 stroke-[5] text-dark" />
      </Switch>
      <Switch.Label
        className={twMerge(
          'cursor-pointer',
          props.checked ? 'text-white' : 'text-gray-3'
        )}
      >
        {props.label}
      </Switch.Label>
    </Switch.Group>
  )
}
