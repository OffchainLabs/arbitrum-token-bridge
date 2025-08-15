import { getTools } from '@lifi/sdk'
import {
  defaultSlippage,
  useLifiSettingsStore
} from './hooks/useLifiSettingsStore'
import { useNetworks } from '../../hooks/useNetworks'
import useSWRImmutable from 'swr/immutable'
import React, { useCallback, useMemo, useState } from 'react'
import { Checkbox } from '../common/Checkbox'
import { Loader } from '../common/atoms/Loader'
import { SafeImage } from '../common/SafeImage'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { twMerge } from 'tailwind-merge'
import {
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { shallow } from 'zustand/shallow'
import { ExternalLink } from '../common/ExternalLink'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import { useAccountType } from '../../hooks/useAccountType'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { isValidLifiTransfer } from '../../pages/api/crosschain-transfers/utils'
import { isDepositMode as isDepositModeUtil } from '../../util/isDepositMode'
import Image from 'next/image'

function useTools() {
  const [{ sourceChain, destinationChain }] = useNetworks()

  return useSWRImmutable(
    [sourceChain.id, destinationChain.id] as const,
    async ([_sourceChainId, _destinationChainId]) => {
      const tools = await getTools({
        chains: [_sourceChainId, _destinationChainId]
      })
      return {
        bridges: tools.bridges.filter(bridge => bridge.key !== 'arbitrum'),
        exchanges: tools.exchanges
      }
    }
  )
}

/**
 * See https://github.com/lifinance/widget/blob/6f120f992509e6c1b2a2fdf2ed256e3aa62e31c6/packages/widget/src/utils/format.ts#L21C1-L46C2
 */
export function formatSlippage(slippage = ''): string {
  if (!slippage) {
    return slippage
  }
  if (slippage === '.') {
    return '0.'
  }

  const parsedSlippage = Number.parseFloat(slippage)
  if (Number.isNaN(Number(slippage)) && !Number.isNaN(parsedSlippage)) {
    return parsedSlippage.toString()
  }
  if (Number.isNaN(parsedSlippage) && slippage !== '.') {
    return defaultSlippage
  }
  if (parsedSlippage > 100) {
    return '100'
  }
  if (parsedSlippage < 0) {
    return Math.abs(parsedSlippage).toString()
  }

  // Returning slippage rather than parsedSlippage here allows for 0. slippage
  return slippage
}

function Tools({
  tools,
  disabledTools,
  toggle
}: {
  tools: {
    key: string
    name: string
    logoURI: string
  }[]
  disabledTools: string[]
  toggle: (tool: string, enable: boolean) => void
}) {
  return (
    <div className={twMerge('grid grid-cols-2 gap-3 pl-2', 'sm:grid-cols-3')}>
      {tools.map(tool => (
        <Checkbox
          key={tool.key}
          label={
            <div className="flex items-center">
              <SafeImage
                src={tool.logoURI}
                width="15"
                height="15"
                className="ml-1 rounded"
                fallback={<div className="h-3 w-3 bg-gray-dark" />}
              />
              <div
                key={tool.key}
                className="ml-1 truncate whitespace-nowrap"
                title={tool.name}
              >
                {tool.name}
              </div>
            </div>
          }
          labelClassName="w-[calc(100%_-_20px)] sm:w-full"
          checked={!disabledTools.includes(tool.key)}
          onChange={checked => toggle(tool.key, checked)}
        />
      ))}
    </div>
  )
}

export const SettingsDialog = React.memo((props: UseDialogProps) => {
  const { data: tools, isLoading: isLoadingTools } = useTools()
  const [networks] = useNetworks()
  const isDepositMode = isDepositModeUtil({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })
  const [selectedToken] = useSelectedToken()
  const {
    slippage,
    setSlippage,
    storeDisabledBridges,
    setDisabledBridgesToStore
  } = useLifiSettingsStore(
    state => ({
      slippage: state.slippage,
      setSlippage: state.setSlippage,
      storeDisabledBridges: state.disabledBridges,
      setDisabledBridgesToStore: state.setDisabledBridges
    }),
    shallow
  )
  const [
    { destinationAddress: destinationAddressFromQueryParams },
    setQueryParams
  ] = useArbQueryParams()
  const [destinationAddress, setDestinationAddress] = useState(
    destinationAddressFromQueryParams
  )
  const { destinationAddressError } =
    useDestinationAddressError(destinationAddress)
  const { isSmartContractWallet } = useAccountType()
  const isLifiSupported = useMemo(
    () =>
      isValidLifiTransfer({
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        fromToken: isDepositMode
          ? selectedToken?.address
          : selectedToken?.l2Address
      }),
    [selectedToken, networks.sourceChain.id, networks.destinationChain.id]
  )
  const [slippageValue, setSlippageValue] = useState(slippage)
  const [disabledBridges, setDisabledBridges] = useState(storeDisabledBridges)

  const toggleBridge = useCallback((bridge: string, enabled: boolean) => {
    setDisabledBridges(disabledBridges =>
      enabled
        ? disabledBridges.filter(b => b !== bridge)
        : [...new Set([...disabledBridges, bridge])]
    )
  }, [])

  const slippageIsTooHigh = slippageValue && Number(slippageValue) >= 1
  const slippageIsTooLow = slippageValue && Number(slippageValue) <= 0.01

  return (
    <Dialog
      {...props}
      title={<div className="text-xl">Settings</div>}
      onClose={(confirmed: boolean) => {
        // When user leave, persist settings to zustand store
        setSlippage(slippageValue)
        setDisabledBridgesToStore(disabledBridges)
        props.onClose(confirmed)

        if (isSmartContractWallet) {
          return
        }

        if (destinationAddressError) {
          setQueryParams({ destinationAddress: undefined })
          setDestinationAddress(undefined)
        } else {
          setQueryParams({ destinationAddress })
        }
      }}
      isFooterHidden
    >
      <div className="mt-4 flex flex-col gap-6 pb-6 text-sm text-gray-2">
        {isLifiSupported && useLifiSettingsStore.persist.hasHydrated() && (
          <>
            <div className="flex flex-col gap-3">
              <div className="text-base"> % Maximum slippage</div>

              <div className="flex flex-nowrap items-center gap-1 opacity-50">
                {slippageIsTooLow && (
                  <>
                    <ExclamationCircleIcon
                      height={16}
                      className="text-orange"
                    />
                    <span className="text-sm text-orange">
                      Slippage amount is low. You may see very limited route
                      options.
                    </span>
                  </>
                )}
                {slippageIsTooHigh && (
                  <>
                    <ExclamationCircleIcon
                      height={16}
                      className="text-orange"
                    />
                    <span className="text-sm text-orange">
                      Slippage amount is high. Industry recommendation is 0.5%
                      or less.
                    </span>
                  </>
                )}
                {!slippageIsTooHigh && !slippageIsTooLow && (
                  <>
                    <InformationCircleIcon
                      height={16}
                      className="text-white/80"
                    />
                    <span className="flex flex-nowrap gap-1">
                      0.5% - 1% is the recommended range for slippage.{' '}
                      <ExternalLink
                        href="https://www.ledger.com/academy/what-is-slippage-in-crypto"
                        className="arb-hover flex items-center underline"
                      >
                        Read more
                        <ArrowTopRightOnSquareIcon className="ml-[2px] h-3 w-3 text-white/60 sm:text-white" />
                      </ExternalLink>
                    </span>
                  </>
                )}
              </div>

              <span className="relative mr-auto">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={defaultSlippage}
                  value={slippageValue}
                  onChange={e => {
                    const value = e.target.value
                    setSlippageValue(formatSlippage(value))
                  }}
                  onFocus={e => {
                    // On focus, if the current value is equal to the default slippage, clear the input
                    if (e.target.value === defaultSlippage) {
                      setSlippageValue('')
                      e.target.value = ''
                    }
                  }}
                  onBlur={e => {
                    const value = e.target.value
                    if (Number.parseFloat(value) === 0 || !value) {
                      setSlippageValue(defaultSlippage)
                    }
                  }}
                  className={twMerge(
                    'h-[40px] w-[100px] rounded border border-white/10 bg-white/10 py-1 pl-2 pr-5  text-center text-sm text-gray-4',
                    (slippageIsTooHigh || slippageIsTooLow) &&
                      'border-orange-dark bg-orange-dark'
                  )}
                />
                <div className="absolute bottom-0 right-2 top-0 flex items-center">
                  %
                </div>
              </span>
            </div>

            <hr className="border-white/20" />

            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-base">
                <Image
                  src="/icons/bridge.svg"
                  width={18}
                  height={18}
                  alt="bridge fee"
                />{' '}
                Supported Bridges
              </div>
              {isLoadingTools && <Loader size="small" color="white" />}
              {tools && tools.bridges.length > 0 && (
                <Tools
                  tools={tools.bridges}
                  toggle={toggleBridge}
                  disabledTools={disabledBridges}
                />
              )}
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
})

SettingsDialog.displayName = 'SettingsDialog'
