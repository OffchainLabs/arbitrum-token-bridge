import { Popover } from '@headlessui/react'
import Image from 'next/image'
import { CSSProperties, useMemo, useState } from 'react'
import { Chain } from 'wagmi'
import { useDebounce } from 'react-use'
import { ChevronLeftIcon, XMarkIcon } from '@heroicons/react/24/outline'

import { chainInfo, getSupportedNetworks, isNetwork } from '../../util/networks'
import { useAccountType } from '../../hooks/useAccountType'
import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'
import { SearchPanel } from './SearchPanel/SearchPanel'
import { SearchPanelTable } from './SearchPanel/SearchPanelTable'
import { twMerge } from 'tailwind-merge'
import { TestnetToggle } from './TestnetToggle'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import {
  PanelWrapperClassnames,
  onPopoverButtonClick,
  onPopoverClose
} from './SearchPanel/SearchPanelUtils'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { useNetworks } from '../../hooks/useNetworks'

type NetworkInfo = {
  chainId: number
  type: 'core' | 'orbit'
}

const chainGroupInfo = {
  core: {
    name: 'CORE CHAINS',
    description: 'Chains managed directly by Ethereum or Arbitrum'
  },
  orbit: {
    name: 'ORBIT CHAINS',
    description: 'Independent chains supported by Arbitrum technology'
  }
}

function NetworkRow({
  networkInfo,
  style,
  onClick,
  close
}: {
  networkInfo: NetworkInfo
  style: CSSProperties
  onClick: (value: Chain) => void
  close: (focusableElement?: HTMLElement) => void
}) {
  const { chainId } = networkInfo
  const { network } = getBridgeUiConfigForChain(chainId)
  const chain = getWagmiChain(chainId)

  const handleClick = () => {
    onClick(chain)
    close() // close the popover after option-click
  }

  return (
    <button
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          handleClick()
        }
      }}
      key={chainId}
      style={style}
      type="button"
      aria-label={`Switch to ${network.name}`}
      className={twMerge(
        'flex h-[90px] w-full items-center gap-4 px-6 py-2 text-lg hover:bg-black/10'
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center lg:h-6 lg:w-6">
        <Image
          src={network.logo}
          alt={`${network.name} logo`}
          className="h-full w-auto"
          width={24}
          height={24}
        />
      </span>
      <div className={twMerge('flex flex-col items-start gap-1')}>
        <span className="truncate leading-none">{network.name}</span>
        {chainInfo[chainId] && (
          <>
            <p className="whitespace-pre-wrap text-left text-xs leading-[1.15]">
              {chainInfo[chainId]!.description}
            </p>
            <p className="text-[10px] leading-none">
              {chainInfo[chainId]!.chainType} Chain,{' '}
              {chainInfo[chainId]!.nativeCurrency} is the native gas token
            </p>
          </>
        )}
      </div>
    </button>
  )
}

function AddCustomOrbitChainButton() {
  const [, setQueryParams] = useArbQueryParams()
  const { isTestnetMode } = useIsTestnetMode()

  if (!isTestnetMode) {
    return null
  }

  return (
    <button
      className="text-sm underline"
      onClick={() => setQueryParams({ settingsOpen: true })}
    >
      <span>Add Custom Orbit Chain</span>
    </button>
  )
}

function NetworksPanel({
  networks,
  onNetworkRowClick,
  close
}: {
  networks: NetworkInfo[]
  onNetworkRowClick: (value: Chain) => void
  close: (focusableElement?: HTMLElement) => void
}) {
  const [errorMessage, setErrorMessage] = useState('')
  const [networkSearched, setNetworkSearched] = useState('')
  const [debouncedNetworkSearched, setDebouncedNetworkSearched] = useState('')

  useDebounce(
    () => {
      setDebouncedNetworkSearched(networkSearched)
    },
    200,
    [networkSearched]
  )

  const networksToShowWithChainTypeInfo = useMemo(() => {
    const _networkSearched = debouncedNetworkSearched.trim().toLowerCase()

    if (_networkSearched) {
      return networks.filter(network => {
        const networkName = getBridgeUiConfigForChain(
          network.chainId
        ).network.name.toLowerCase()
        return networkName.includes(_networkSearched)
      })
    }

    const coreNetworks = networks.filter(network => network.type === 'core')
    const orbitNetworks = networks.filter(network => network.type === 'orbit')

    return [
      chainGroupInfo.core,
      ...coreNetworks,
      chainGroupInfo.orbit,
      ...orbitNetworks
    ]
  }, [debouncedNetworkSearched, networks])

  return (
    <div className="flex flex-col gap-4">
      <SearchPanelTable
        searchInputPlaceholder="Search a network name"
        searchInputValue={networkSearched}
        onSearchInputChange={event => {
          setErrorMessage('')
          setNetworkSearched(event.target.value)
        }}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        errorMessage={errorMessage}
        rowCount={networksToShowWithChainTypeInfo.length}
        rowHeight={90}
        rowRenderer={virtualizedProps => {
          const networkOrChainTypeInfo =
            networksToShowWithChainTypeInfo[virtualizedProps.index]
          if (!networkOrChainTypeInfo) {
            return null
          }

          // Chain Type Info row
          if (!('chainId' in networkOrChainTypeInfo)) {
            const isCoreGroup = networkOrChainTypeInfo.name === 'CORE CHAINS'
            return (
              <div
                key={networkOrChainTypeInfo.name}
                style={virtualizedProps.style}
                className={twMerge(
                  'px-6 py-6',
                  !isCoreGroup &&
                    'before:-mt-4 before:mb-4 before:block before:h-[1px] before:w-full before:bg-black/30 before:content-[""]'
                )}
              >
                <p className="text-sm text-dark">
                  {networkOrChainTypeInfo.name}
                </p>
                {networkOrChainTypeInfo.description && (
                  <p className="mt-2 text-xs">
                    {networkOrChainTypeInfo.description}
                  </p>
                )}
              </div>
            )
          }

          return (
            <NetworkRow
              key={networkOrChainTypeInfo.chainId}
              style={virtualizedProps.style}
              networkInfo={networkOrChainTypeInfo}
              onClick={onNetworkRowClick}
              close={close}
            />
          )
        }}
      />
      <div className="flex justify-between pb-2">
        <TestnetToggle
          className={{
            switch:
              'ui-checked:bg-black/20 ui-not-checked:bg-black/20 [&_span]:ui-not-checked:bg-black'
          }}
          label="Testnet mode"
        />
        <AddCustomOrbitChainButton />
      </div>
    </div>
  )
}

export const NetworkSelectionContainer = ({
  children,
  buttonClassName,
  buttonStyle,
  onChange
}: {
  children: React.ReactNode
  buttonClassName: string
  buttonStyle?: CSSProperties
  onChange: (value: Chain) => void
}) => {
  const [{ sourceChain }] = useNetworks()
  const { isTestnetMode } = useIsTestnetMode()

  const supportedNetworks = getSupportedNetworks(
    sourceChain.id,
    !!isTestnetMode
  ).filter(chainId => chainId !== sourceChain.id)

  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  const coreNetworks = supportedNetworks
    .filter(
      network =>
        isNetwork(network).isEthereumMainnetOrTestnet ||
        isNetwork(network).isArbitrum
    )
    .map((network): NetworkInfo => ({ chainId: Number(network), type: 'core' }))
  const orbitNetworks = supportedNetworks
    .filter(network => isNetwork(network).isOrbitChain)
    .map(
      (network): NetworkInfo => ({
        chainId: Number(network),
        type: 'orbit'
      })
    )

  const finalNetworks: NetworkInfo[] = [...coreNetworks, ...orbitNetworks]

  return (
    <Popover className="relative w-full lg:w-max">
      <Popover.Button
        style={buttonStyle}
        disabled={
          isSmartContractWallet ||
          typeof isSmartContractWallet === 'undefined' ||
          isLoadingAccountType
        }
        className={buttonClassName}
        onClick={onPopoverButtonClick}
      >
        {children}
      </Popover.Button>

      <Popover.Panel className={twMerge(PanelWrapperClassnames)}>
        {({ close }) => {
          function onClose() {
            onPopoverClose()
            close()
          }
          return (
            <>
              <div className="flex items-center justify-between border-b border-b-black px-5 py-4 lg:hidden">
                <button onClick={onClose}>
                  <ChevronLeftIcon className="h-8 w-8" />
                </button>
                <button onClick={onClose}>
                  <XMarkIcon className="h-8 w-8" />
                </button>
              </div>
              <div className="px-5 py-4">
                <SearchPanel
                  showCloseButton={false}
                  SearchPanelSecondaryPage={null}
                  mainPageTitle="Select Network"
                  secondPageTitle="Networks"
                  isLoading={false}
                  loadingMessage="Fetching Networks..."
                  bottomRightCTAtext=""
                >
                  <NetworksPanel
                    networks={finalNetworks}
                    close={onClose}
                    onNetworkRowClick={onChange}
                  />
                </SearchPanel>
              </div>
            </>
          )
        }}
      </Popover.Panel>
    </Popover>
  )
}
