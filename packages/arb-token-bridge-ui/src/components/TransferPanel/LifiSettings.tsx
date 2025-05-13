import { ChainType, getConnections, getTools } from '@lifi/sdk'
import {
  defaultSlippage,
  useLifiSettingsStore
} from './hooks/useLifiSettingsStore'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import useSWRImmutable from 'swr/immutable'
import { useCallback, useState } from 'react'
import { Popover } from '@headlessui/react'
import { Checkbox } from '../common/Checkbox'
import { Loader } from '../common/atoms/Loader'
import { Transition } from '../common/Transition'
import { SafeImage } from '../common/SafeImage'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { constants } from 'ethers'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { isNetwork } from '../../util/networks'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { twMerge } from 'tailwind-merge'
import {
  ArrowTopRightOnSquareIcon,
  Cog8ToothIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { shallow } from 'zustand/shallow'
import { ExternalLink } from '../common/ExternalLink'

export function getFromAndToTokenAddresses({
  isDepositMode,
  selectedToken,
  sourceChainId
}: {
  isDepositMode: boolean
  selectedToken: Pick<ERC20BridgeToken, 'address' | 'l2Address'> | null
  sourceChainId: number
}) {
  const {
    isArbitrum: isSourceArbitrum,
    isArbitrumSepolia: isSourceArbitrumSepolia
  } = isNetwork(sourceChainId)
  const fromToken = isDepositMode
    ? selectedToken?.address
    : selectedToken?.l2Address
  const toToken = isDepositMode
    ? selectedToken?.l2Address
    : selectedToken?.address

  if (isTokenNativeUSDC(selectedToken?.address) && !isDepositMode) {
    if (isSourceArbitrum) {
      return {
        toToken: CommonAddress.Ethereum.USDC,
        fromToken: CommonAddress.ArbitrumOne.USDC
      }
    }

    if (isSourceArbitrumSepolia) {
      return {
        toToken: CommonAddress.Sepolia.USDC,
        fromToken: CommonAddress.ArbitrumSepolia.USDC
      }
    }
  }

  return {
    fromToken,
    toToken
  }
}

function useIsLifiSupported() {
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const { disabledBridges, disabledExchanges } = useLifiSettingsStore(
    ({ disabledBridges, disabledExchanges }) => ({
      disabledBridges,
      disabledExchanges
    }),
    shallow
  )

  const [_token] = useSelectedToken()
  const token = _token ?? {
    address: constants.AddressZero,
    l2Address: constants.AddressZero
  }

  const { fromToken, toToken } = getFromAndToTokenAddresses({
    isDepositMode,
    selectedToken: token,
    sourceChainId: networks.sourceChain.id
  })

  const { data, isLoading } = useSWRImmutable(
    [
      networks.sourceChain.id,
      networks.destinationChain.id,
      fromToken,
      toToken,
      disabledBridges,
      disabledExchanges,
      'useIsLifiSupported'
    ] as const,
    ([
      _sourceChainId,
      _destinationChainId,
      _fromToken,
      _toToken,
      _disabledBridge,
      _disabledExchanges
    ]) =>
      getConnections({
        fromChain: _sourceChainId,
        fromToken: _fromToken,
        toChain: _destinationChainId,
        toToken: _toToken,
        chainTypes: [ChainType.EVM],
        denyBridges: _disabledBridge,
        denyExchanges: _disabledExchanges
      }),
    {
      keepPreviousData: true
    }
  )

  return {
    isLoading,
    isSupported: !isLoading && data && data.connections.length > 0
  }
}

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
              <div key={tool.key} className="ml-1 truncate whitespace-nowrap">
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

export function LifiSettings() {
  const { isLoading, isSupported } = useIsLifiSupported()
  const { data: tools, isLoading: isLoadingTools } = useTools()
  const {
    slippage,
    setSlippage,
    storeDisabledBridges,
    storeDisabledExchanges,
    setDisabledExchangesToStore,
    setDisabledBridgesToStore
  } = useLifiSettingsStore(
    state => ({
      slippage: state.slippage,
      setSlippage: state.setSlippage,
      storeDisabledBridges: state.disabledBridges,
      storeDisabledExchanges: state.disabledExchanges,
      setDisabledExchangesToStore: state.setDisabledExchanges,
      setDisabledBridgesToStore: state.setDisabledBridges
    }),
    shallow
  )

  const [slippageValue, setSlippageValue] = useState(slippage)
  const [disabledBridges, setDisabledBridges] = useState(storeDisabledBridges)
  const [disabledExchanges, setDisabledExchanges] = useState(
    storeDisabledExchanges
  )

  const toggleBridge = useCallback((bridge: string, enabled: boolean) => {
    setDisabledBridges(disabledBridges =>
      enabled
        ? disabledBridges.filter(b => b !== bridge)
        : [...new Set([...disabledBridges, bridge])]
    )
  }, [])

  const toggleExchange = useCallback((exchange: string, enabled: boolean) => {
    setDisabledExchanges(disabledExchanges =>
      enabled
        ? disabledExchanges.filter(e => e !== exchange)
        : [...new Set([...disabledExchanges, exchange])]
    )
  }, [])

  if (
    (!isLoading && !isSupported) ||
    !useLifiSettingsStore.persist.hasHydrated()
  ) {
    return null
  }

  const slippageIsTooHigh = slippageValue && Number(slippageValue) >= 1
  const slippageIsTooLow = slippageValue && Number(slippageValue) <= 0.01

  return (
    <Popover className="z-50 flex sm:relative">
      {({ open }) => (
        <>
          <Popover.Button className="ml-auto">
            <Cog8ToothIcon width={18} className="arb-hover text-white" />
          </Popover.Button>
          <Transition
            isOpen={open}
            afterLeave={() => {
              // When user leave, persist settings to zustand store
              setSlippage(slippageValue)
              setDisabledBridgesToStore(disabledBridges)
              setDisabledExchangesToStore(disabledExchanges)
            }}
            options={{
              unmountOnLeave: false
            }}
            className="max-sm:transform-none" // Remove Transition from the stacking context
          >
            <Popover.Panel
              className={twMerge(
                'flex flex-col gap-4 border-black bg-gray-8 p-4 text-sm text-gray-2',
                'sm:absolute sm:left-auto sm:top-auto sm:mt-6 sm:h-auto sm:max-w-[700px] sm:-translate-x-full sm:rounded sm:border sm:p-6',
                'fixed left-0 top-0 mt-0 h-screen w-screen' // mobile design
              )}
            >
              <div className="flex items-center text-xl">
                <span>Li.Fi Settings</span>
                <Popover.Button className="ml-auto">
                  <XMarkIcon className="arb-hover h-6 w-6 text-gray-7" />
                </Popover.Button>
              </div>

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

              <div className="grid gap-2">
                <div>Supported Exchanges</div>
                {isLoadingTools && <Loader size="small" color="white" />}
                {tools && tools.exchanges.length > 0 && (
                  <Tools
                    tools={tools.exchanges}
                    toggle={toggleExchange}
                    disabledTools={disabledExchanges}
                  />
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
