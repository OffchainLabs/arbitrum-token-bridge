import { Switch } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/outline'

export type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Checkbox(props: CheckboxProps) {
  return (
    <Switch
      {...props}
      className={`arb-hover h-4 w-4 transform rounded transition duration-200 ease-in-out ${
        props.checked ? 'bg-dark' : 'border border-dark bg-white'
      }`}
    >
      <CheckIcon className="h-4 w-4 text-white" />
    </Switch>
  )
}
