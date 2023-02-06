import { Switch } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/outline'

export type CheckboxProps = {
  label: string | React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <Switch.Group as="div" className="flex flex-row items-center space-x-3">
      <Switch
        onChange={onChange}
        className={`arb-hover h-4 w-4 transform rounded transition duration-200 ease-in-out ${
          checked ? 'bg-dark' : 'border border-dark bg-white'
        }`}
      >
        <CheckIcon className="h-4 w-4 text-white" />
      </Switch>
      <Switch.Label className="cursor-pointer">{label}</Switch.Label>
    </Switch.Group>
  )
}
