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
import { AdvancedSettings } from './AdvancedSettings'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import { useAccountType } from '../../hooks/useAccountType'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { isValidLifiTransfer } from '../../app/api/crosschain-transfers/utils'
import { isDepositMode as isDepositModeUtil } from '../../util/isDepositMode'

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
    <div className={twMerge('grid grid-cols-2 gap-2 pl-2', 'sm:grid-cols-3')}>
      {tools.map(tool => (
        <Checkbox
          key={tool.key}
          label={
            <div className="flex items-center">
              <SafeImage
                src={tool.logoURI}
                width="15"
                height="15"
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
  const { accountType, isLoading: isLoadingAccountType } = useAccountType()
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

        if (accountType === 'smart-contract-wallet') {
          return
        }

        if (destinationAddressError) {
          setQueryParams({ destinationAddress: undefined })
          setDestinationAddress(undefined)
        } else {
          // If string is empty, we want to remove the param from URL (passing undefined)
          setQueryParams({
            destinationAddress: destinationAddress || undefined
          })
        }
      }}
      isFooterHidden
    >
      <div className="mt-4 flex flex-col gap-4 pb-6 text-sm text-gray-2">
        {isLifiSupported && useLifiSettingsStore.persist.hasHydrated() && (
          <>
            <div className="flex flex-col justify-center gap-1">
              <span className="relative mr-auto">
                Maximum slippage:{' '}
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
                    'ml-1 w-12 rounded border border-gray-dark bg-black py-1 pl-2 pr-5 text-center text-sm text-gray-4',
                    (slippageIsTooHigh || slippageIsTooLow) &&
                      'border-orange-dark bg-orange-dark'
                  )}
                />
                <div className="absolute bottom-0 right-2 top-0 flex items-center">
                  %
                </div>
              </span>
              <div className="flex items-center gap-1">
                {slippageIsTooLow && (
                  <>
                    <ExclamationCircleIcon
                      height={20}
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
                      height={20}
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
                      height={20}
                      className="text-white/80"
                    />
                    <span className="md:flex md:items-center md:gap-1">
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
            </div>

            <div className="grid gap-2">
              <div>Supported Bridges</div>
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
        {!isLoadingAccountType && accountType !== 'smart-contract-wallet' && (
          // For SCW, destination address is shown outside of settings panel
          <AdvancedSettings
            destinationAddress={destinationAddress}
            onDestinationAddressChange={setDestinationAddress}
          />
        )}
      </div>
    </Dialog>
  )
})

SettingsDialog.displayName = 'SettingsDialog'
