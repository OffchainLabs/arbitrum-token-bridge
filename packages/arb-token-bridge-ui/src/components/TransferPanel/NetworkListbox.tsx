import { Listbox } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { Chain } from 'wagmi'
import Image from 'next/image'

import { getNetworkName } from '../../util/networks'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { Transition } from '../common/Transition'

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
      {({ open }) => (
        <>
          <Listbox.Button
            style={{ backgroundColor: color.primary }}
            className="arb-hover flex w-max items-center gap-1 rounded px-3 py-2 text-sm text-white md:gap-2 md:text-xl"
          >
            <span className="max-w-[220px] truncate leading-extra-tight md:max-w-[250px]">
              {label} {getNetworkName(value.id)}
            </span>
            {!disabled && (
              <ChevronDownIcon
                className={twMerge(
                  'h-3 w-3 transition-transform',
                  open ? '-rotate-180' : 'rotate-0'
                )}
              />
            )}
          </Listbox.Button>

          <Transition className="absolute left-0 right-auto z-20 min-w-full lg:left-auto lg:right-0">
            <Listbox.Options className="mt-2 flex max-h-[365px] min-w-full flex-col gap-[8px] overflow-y-auto overflow-x-hidden rounded border border-white/30 bg-gray-1 font-normal text-white lg:left-auto lg:right-0">
              {options.map(option => {
                return (
                  <Listbox.Option
                    key={option.id}
                    value={option}
                    className={twMerge(
                      'hover:white/20 flex h-12 cursor-pointer select-none items-center gap-1 px-3 py-2 transition-[background] duration-200 ui-selected:bg-white/20 ui-active:bg-white/20'
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
          </Transition>
        </>
      )}
    </Listbox>
  )
}
