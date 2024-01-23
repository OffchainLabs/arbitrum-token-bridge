import { Popover } from '@headlessui/react'
import Image from 'next/image'
import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { Chain } from 'wagmi'
import { useDebounce } from 'react-use'
import { ChevronLeftIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { List, ListRowProps } from 'react-virtualized'

import { ChainId, getSupportedChainIds, isNetwork } from '../../util/networks'
import { useAccountType } from '../../hooks/useAccountType'
import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'
import { SearchPanel } from './SearchPanel/SearchPanel'
import { SearchPanelTable } from './SearchPanel/SearchPanelTable'
import { TestnetToggle } from './TestnetToggle'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import {
  panelWrapperClassnames,
  onPopoverButtonClick,
  onPopoverClose
} from './SearchPanel/SearchPanelUtils'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { useNetworks } from '../../hooks/useNetworks'

type NetworkType = 'core' | 'orbit'

const chainGroupInfo: {
  [key in NetworkType]: {
    name: string
    description: string
  }
} = {
  core: {
    name: 'CORE CHAINS',
    description: 'Chains managed directly by Ethereum or Arbitrum'
  },
  orbit: {
    name: 'ORBIT CHAINS',
    description: 'Independent projects using Arbitrum technology.'
  }
}

function NetworkRow({
  chainId,
  style,
  onClick,
  close
}: {
  chainId: ChainId
  style: CSSProperties
  onClick: (value: Chain) => void
  close: (focusableElement?: HTMLElement) => void
}) {
  const { network, description, chainType, nativeTokenData } =
    getBridgeUiConfigForChain(chainId)
  const chain = getWagmiChain(chainId)
  const [{ sourceChain }] = useNetworks()

  function handleClick() {
    onClick(chain)
    close() // close the popover after option-click
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter') {
      handleClick()
    }
  }

  return (
    <button
      onClick={handleClick}
      onKeyDown={onKeyDown}
      key={chainId}
      style={style}
      type="button"
      aria-label={`Switch to ${network.name}`}
      className={twMerge(
        'flex h-[90px] w-full items-center gap-4 px-6 py-2 text-lg hover:bg-black/10',
        chainId === sourceChain.id && 'bg-black/10' // selected row
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
        {description && (
          <p className="whitespace-pre-wrap text-left text-xs leading-[1.15]">
            {description}
          </p>
        )}
        {chainType && (
          <p className="text-[10px] leading-none">
            {chainType} Chain, {nativeTokenData?.symbol ?? 'ETH'} is the native
            gas token
          </p>
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
  networks: ChainId[]
  onNetworkRowClick: (value: Chain) => void
  close: (focusableElement?: HTMLElement) => void
}) {
  const [errorMessage, setErrorMessage] = useState('')
  const [networkSearched, setNetworkSearched] = useState('')
  const [debouncedNetworkSearched, setDebouncedNetworkSearched] = useState('')
  const listRef = useRef<List>(null)
  const { isTestnetMode } = useIsTestnetMode()

  const testnetToggleClassNames = {
    switch:
      'ui-checked:bg-black/20 ui-not-checked:bg-black/20 [&_span]:ui-not-checked:bg-black'
  }

  useEffect(() => {
    listRef.current?.recomputeRowHeights()
  }, [isTestnetMode])

  useDebounce(
    () => {
      setDebouncedNetworkSearched(networkSearched)
    },
    200,
    [networkSearched]
  )

  function getRowHeight({ index }: { index: number }) {
    const rowItemOrChainId = networksToShowWithChainTypeInfo[index]
    if (!rowItemOrChainId) {
      return 0
    }
    if (typeof rowItemOrChainId === 'object') {
      return 65
    }
    const rowItem = getBridgeUiConfigForChain(rowItemOrChainId)
    if (rowItem.description) {
      return 90
    }
    return 52
  }

  const networksToShowWithChainTypeInfo = useMemo(() => {
    const _networkSearched = debouncedNetworkSearched.trim().toLowerCase()

    if (_networkSearched) {
      return networks.filter(network => {
        const networkName =
          getBridgeUiConfigForChain(network).network.name.toLowerCase()
        return networkName.includes(_networkSearched)
      })
    }

    const coreNetworks = networks.filter(
      chainId => !isNetwork(chainId).isOrbitChain
    )
    const orbitNetworks = networks.filter(
      chainId => isNetwork(chainId).isOrbitChain
    )

    return [
      chainGroupInfo.core,
      ...coreNetworks,
      chainGroupInfo.orbit,
      ...orbitNetworks
    ]
  }, [debouncedNetworkSearched, networks])

  const rowRenderer = useCallback(
    (virtualizedProps: ListRowProps) => {
      const networkOrChainTypeInfo =
        networksToShowWithChainTypeInfo[virtualizedProps.index]
      if (!networkOrChainTypeInfo) {
        return null
      }

      // Chain Type Info row
      if (typeof networkOrChainTypeInfo === 'object') {
        const isCoreGroup = networkOrChainTypeInfo.name === 'CORE CHAINS'
        return (
          <div
            key={networkOrChainTypeInfo.name}
            style={virtualizedProps.style}
            className={twMerge(
              'px-6 py-3',
              !isCoreGroup &&
                'before:-mt-3 before:mb-3 before:block before:h-[1px] before:w-full before:bg-black/30 before:content-[""]'
            )}
          >
            <p className="text-sm text-dark">{networkOrChainTypeInfo.name}</p>
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
          key={networkOrChainTypeInfo}
          style={virtualizedProps.style}
          chainId={networkOrChainTypeInfo}
          onClick={onNetworkRowClick}
          close={close}
        />
      )
    },
    [close, networksToShowWithChainTypeInfo, onNetworkRowClick]
  )

  const onSearchInputChange = function (
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setErrorMessage('')
    setNetworkSearched(event.target.value)
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchPanelTable
        searchInputPlaceholder="Search a network name"
        searchInputValue={networkSearched}
        onSearchInputChange={onSearchInputChange}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        errorMessage={errorMessage}
        rowCount={networksToShowWithChainTypeInfo.length}
        rowHeight={getRowHeight}
        rowRenderer={rowRenderer}
        listRef={listRef}
      />
      <div className="flex justify-between pb-2">
        <TestnetToggle
          className={testnetToggleClassNames}
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
  const { isTestnetMode } = useIsTestnetMode()

  const supportedNetworks = getSupportedChainIds({
    includeTestnets: isTestnetMode
  })

  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  const coreNetworks = useMemo(
    () =>
      supportedNetworks.filter(
        network =>
          isNetwork(network).isEthereumMainnetOrTestnet ||
          isNetwork(network).isArbitrum
      ),
    [supportedNetworks]
  )
  const orbitNetworks = useMemo(
    () => supportedNetworks.filter(network => isNetwork(network).isOrbitChain),
    [supportedNetworks]
  )

  const finalNetworks: ChainId[] = useMemo(
    () => [...coreNetworks, ...orbitNetworks],
    [coreNetworks, orbitNetworks]
  )

  return (
    <Popover className="relative w-full lg:w-max">
      <Popover.Button
        style={buttonStyle}
        disabled={isSmartContractWallet || isLoadingAccountType}
        className={buttonClassName}
        onClick={onPopoverButtonClick}
      >
        {children}
      </Popover.Button>

      <Popover.Panel className={twMerge(panelWrapperClassnames)}>
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
                  bottomRightCtaText=""
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
