import { Switch } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/outline'

export type CheckboxProps = {
  label: string | React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Checkbox(props: CheckboxProps) {
  return (
    <Switch.Group as="div" className="flex flex-row items-center space-x-3">
      <Switch
        {...props}
        className={`arb-hover h-4 w-4 rounded transition duration-200 ease-in-out ${
          props.checked ? 'bg-dark' : 'border border-dark bg-white'
        }`}
      >
        <CheckIcon className="h-4 w-4 text-white" />
      </Switch>
      <Switch.Label className="cursor-pointer">{props.label}</Switch.Label>
    </Switch.Group>
  )
}
