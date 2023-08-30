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
        className={`flex gap-6 ${
          orientation === 'vertical' && 'flex-col items-start'
        }`}
      >
        {options.map(option => (
          <RadioGroup.Option key={option.id} value={option.value}>
            {({ checked }: { checked: boolean }) => (
              <>
                <div className="flex w-full cursor-pointer gap-3">
                  {/* radio checkmark */}
                  {checked ? (
                    <div className="radio-selected mb-1 mt-[3px] h-4 w-4 shrink-0 rounded-full border border-white bg-white shadow-[inset_0_0_0_2px_rgba(0,0,0,1)]"></div>
                  ) : (
                    <div className="mb-1 mt-[3px] h-4 w-4 shrink-0 rounded-full border border-white"></div>
                  )}

                  {/* radio option text */}
                  <div className="flex flex-col">
                    {/* option label */}
                    <RadioGroup.Label
                      as="p"
                      className={`heading mb-1 mr-4 text-sm`}
                    >
                      {option.label}
                    </RadioGroup.Label>

                    {/* option description */}
                    {option.description && (
                      <RadioGroup.Description
                        as="span"
                        className="text-sm text-gray-3"
                      >
                        <span>{option.description}</span>
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
