import { Listbox } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import { Chain } from 'wagmi'
import Image from 'next/image'

import { getNetworkName } from '../../util/networks'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'

export type NetworkListboxProps = {
  disabled?: boolean
  label: string
  options: Chain[]
  value: Chain
  onChange: (value: Chain) => void
}

export function NetworkListbox({
  disabled = false,
  label,
  options,
  value,
  onChange
}: NetworkListboxProps) {
  const { color } = getBridgeUiConfigForChain(value.id)

  return (
    <Listbox
      as="div"
      className="relative"
      disabled={disabled}
      value={value}
      onChange={onChange}
    >
      <Listbox.Button
        style={{ backgroundColor: color.primary }}
        className="arb-hover flex w-max items-center space-x-1 rounded px-3 py-2 text-sm text-white md:text-xl"
      >
        <span className="max-w-[220px] truncate leading-extra-tight md:max-w-[250px]">
          {label} {getNetworkName(value.id)}
        </span>
        {!disabled && <ChevronDownIcon className="h-4 w-4" />}
      </Listbox.Button>

      <Listbox.Options className="absolute left-0 z-20 mt-1 max-h-[365px] min-w-full overflow-y-auto overflow-x-hidden rounded border border-white/30 bg-gray-1 font-normal text-white lg:left-auto lg:right-0">
        {options.map(option => {
          return (
            <Listbox.Option
              key={option.id}
              value={option}
              className={twMerge(
                'hover:white/20 flex h-12 cursor-pointer select-none items-center gap-1 px-3 py-2 ui-selected:bg-white/20 ui-active:bg-white/20'
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center">
                <Image
                  src={getBridgeUiConfigForChain(option.id).network.logo}
                  alt={`${getNetworkName(option.id)} logo`}
                  className="max-h-7 w-auto"
                  width={35}
                  height={35}
                />
              </div>
              <span className="max-w-[140px] truncate">
                {getNetworkName(option.id)}
              </span>
            </Listbox.Option>
          )
        })}
      </Listbox.Options>
    </Listbox>
  )
}
