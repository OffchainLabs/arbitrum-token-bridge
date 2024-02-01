import { Switch } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/outline'

export type CheckboxProps = {
  label: string | React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Checkbox(props: CheckboxProps) {
  return (
    <Switch.Group as="div" className="flex flex-row items-start space-x-2">
      <Switch
        {...props}
        className={`arb-hover mt-1 h-4 w-4 rounded transition duration-200 ease-in-out ${
          props.checked
            ? 'border border-dark bg-white'
            : 'border border-white bg-dark'
        }`}
      >
        <CheckIcon className="ml-[2px] h-3 w-3 stroke-[3] text-dark" />
      </Switch>
      <Switch.Label className="cursor-pointer">{props.label}</Switch.Label>
    </Switch.Group>
  )
}
