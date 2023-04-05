/*
  Standardized Radio input
*/

import { RadioGroup } from '@headlessui/react'

export type RadioType<T> = {
  value: T
  onChange: (param: T) => void
  label?: string
  orientation?: 'horizontal' | 'vertical'
  options: {
    label: string
    description?: string
    value: T
    id: string
  }[]
}

export const Radio = ({
  value,
  label,
  orientation,
  onChange,
  options
}: RadioType<string>) => {
  return (
    <RadioGroup value={value} onChange={onChange} className="radio-switch">
      {/* radio group title (optional) */}
      {label && <RadioGroup.Label className="mb-4">{label}</RadioGroup.Label>}

      <div
        className={`flex gap-2 ${
          orientation === 'vertical' && 'flex-col items-start'
        }`}
      >
        {options.map(option => (
          <RadioGroup.Option key={option.id} value={option.value}>
            {({ checked }: { checked: boolean }) => (
              <>
                <div className="flex w-full cursor-pointer gap-4">
                  {/* radio checkmark */}
                  {checked ? (
                    <div className="radio-selected mx-2 my-1 h-5 w-5 shrink-0 rounded-full border-2 border-gray-5 bg-blue-link shadow-[inset_0_0_0_3px_rgba(0,0,0,0.5)]"></div>
                  ) : (
                    <div className="mx-2 my-1 h-5 w-5 shrink-0 rounded-full border-2 border-gray-5"></div>
                  )}

                  {/* radio option text */}
                  <div className="flex flex-col">
                    {/* option label */}
                    <RadioGroup.Label as="p" className={`heading mr-4`}>
                      {option.label}
                    </RadioGroup.Label>

                    {/* option description */}
                    {option.description && (
                      <RadioGroup.Description
                        as="span"
                        className="text-sm opacity-40"
                      >
                        <span>{option.description}</span>{' '}
                      </RadioGroup.Description>
                    )}
                  </div>
                </div>
              </>
            )}
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  )
}
