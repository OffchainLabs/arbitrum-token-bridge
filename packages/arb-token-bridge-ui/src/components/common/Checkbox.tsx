import { Switch } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

export type CheckboxProps = {
  label: string | React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}

export function Checkbox(props: CheckboxProps) {
  return (
    <Switch.Group
      as="div"
      className={twMerge(
        'flex flex-row items-start space-x-3',
        props.className
      )}
    >
      <Switch
        {...props}
        className={`arb-hover mt-1 h-4 w-4 rounded transition duration-200 ease-in-out ${
          props.checked
            ? 'border border-white bg-dark'
            : 'border border-dark bg-white'
        }`}
      >
        <CheckIcon className="h-4 w-4 text-white" />
      </Switch>
      <Switch.Label className="cursor-pointer">{props.label}</Switch.Label>
    </Switch.Group>
  )
}
