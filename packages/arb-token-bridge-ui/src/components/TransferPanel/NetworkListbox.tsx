import { Listbox, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { Fragment, useCallback, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import { Chain } from 'wagmi'
import Image from 'next/image'

import { getNetworkLogo, getNetworkName, isNetwork } from '../../util/networks'

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
  const buttonClassName = useMemo(() => {
    const {
      isArbitrum,
      isArbitrumNova,
      isOrbitChain,
      isXaiTestnet,
      isStylusTestnet,
      isInspace
    } = isNetwork(value.id)

    if (isXaiTestnet) {
      return 'bg-xai-primary'
    }

    if (isInspace) {
      return 'bg-eth-primary'
    }

    if (isStylusTestnet) {
      return 'bg-stylus-primary'
    }

    if (isOrbitChain) {
      return 'bg-orbit-primary'
    }

    if (!isArbitrum) {
      return 'bg-eth-primary'
    }

    if (isArbitrumNova) {
      return 'bg-arb-nova-primary'
    }

    return 'bg-arb-one-primary'
  }, [value])

  const getOptionClassName = useCallback(
    (index: number) => {
      if (index === 0) {
        return 'rounded-tl-xl rounded-tr-xl'
      }

      if (index === options.length - 1) {
        return 'rounded-bl-xl rounded-br-xl'
      }

      return ''
    },
    [options.length]
  )

  return (
    <Listbox
      as="div"
      className="relative"
      disabled={disabled}
      value={value}
      onChange={onChange}
    >
      <Listbox.Button
        className={`arb-hover flex w-max items-center space-x-1 rounded-full px-3 py-2 text-sm text-white md:text-2xl lg:px-4 lg:py-3 ${buttonClassName}`}
      >
        <span className="max-w-[220px] truncate md:max-w-[250px]">
          {label} {getNetworkName(value.id)}
        </span>
        {!disabled && <ChevronDownIcon className="h-4 w-4" />}
      </Listbox.Button>

      <Transition
        as={Fragment}
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Listbox.Options className="absolute z-20 ml-2 mt-2 overflow-hidden rounded-xl bg-white shadow-[0px_4px_12px_#9e9e9e]">
          {options.map((option, index) => {
            return (
              <Listbox.Option
                key={option.id}
                value={option}
                className={twMerge(
                  'ui-selected:bg-[rgba(0,0,0,0.2) flex h-12 min-w-max cursor-pointer select-none items-center space-x-2 px-4 py-7 hover:bg-[rgba(0,0,0,0.2)] ui-active:bg-[rgba(0,0,0,0.2)]',
                  getOptionClassName(index)
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center">
                  <Image
                    src={getNetworkLogo(option.id)}
                    alt={`${getNetworkName(option.id)} logo`}
                    className="max-h-7 w-auto"
                    width={36}
                    height={36}
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
    </Listbox>
  )
}
