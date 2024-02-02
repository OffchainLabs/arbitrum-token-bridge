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
import { XMarkIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { AutoSizer, List, ListRowProps } from 'react-virtualized'

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

enum ChainGroupName {
  core = 'CORE CHAINS',
  orbit = 'ORBIT CHAINS'
}

type ChainGroupInfo = {
  name: ChainGroupName
  description: string
}

const chainGroupInfo: { [key in NetworkType]: ChainGroupInfo } = {
  core: {
    name: ChainGroupName.core,
    description: 'Chains managed directly by Ethereum or Arbitrum'
  },
  orbit: {
    name: ChainGroupName.orbit,
    description: 'Independent projects using Arbitrum technology.'
  }
}

function ChainTypeInfoRow({
  chainGroup,
  style
}: {
  chainGroup: ChainGroupInfo
  style: CSSProperties
}) {
  const { name, description } = chainGroup
  const isCoreGroup = chainGroup.name === ChainGroupName.core

  return (
    <div
      key={name}
      style={style}
      className={twMerge(
        'px-6 py-3',
        !isCoreGroup &&
          'before:-mt-3 before:mb-3 before:block before:h-[1px] before:w-full before:bg-black/30 before:content-[""]'
      )}
    >
      <p className="text-sm text-dark">{name}</p>
      {description && <p className="mt-2 text-xs">{description}</p>}
    </div>
  )
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
  const { network, nativeTokenData } = getBridgeUiConfigForChain(chainId)
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
        {network.description && (
          <p className="whitespace-pre-wrap text-left text-xs leading-[1.15]">
            {network.description}
          </p>
        )}
        {network.type && (
          <p className="text-[10px] leading-none">
            {network.type} Chain, {nativeTokenData?.symbol ?? 'ETH'} is the
            native gas token
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
  chainIds,
  onNetworkRowClick,
  close
}: {
  chainIds: ChainId[]
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

  useDebounce(
    () => {
      setDebouncedNetworkSearched(networkSearched)
    },
    200,
    [networkSearched]
  )

  const networksToShow = useMemo(() => {
    const _networkSearched = debouncedNetworkSearched.trim().toLowerCase()

    if (_networkSearched) {
      return chainIds.filter(chainId => {
        const networkName =
          getBridgeUiConfigForChain(chainId).network.name.toLowerCase()
        return networkName.includes(_networkSearched)
      })
    }

    const coreNetworks = chainIds.filter(
      chainId => !isNetwork(chainId).isOrbitChain
    )
    const orbitNetworks = chainIds.filter(
      chainId => isNetwork(chainId).isOrbitChain
    )

    return {
      core: coreNetworks,
      orbit: orbitNetworks
    }
  }, [debouncedNetworkSearched, chainIds])

  const isNetworkSearchResult = Array.isArray(networksToShow)

  const networkRowsWithChainInfoRows = useMemo(() => {
    if (isNetworkSearchResult) {
      return networksToShow
    }
    return [
      ChainGroupName.core,
      ...networksToShow.core,
      ChainGroupName.orbit,
      ...networksToShow.orbit
    ]
  }, [isNetworkSearchResult, networksToShow])

  function getRowHeight({ index }: { index: number }) {
    const rowItemOrChainId = networkRowsWithChainInfoRows[index]
    if (!rowItemOrChainId) {
      return 0
    }
    if (typeof rowItemOrChainId === 'string') {
      return 65
    }
    const rowItem = getBridgeUiConfigForChain(rowItemOrChainId)
    if (rowItem.network.description) {
      return 90
    }
    return 52
  }

  useEffect(() => {
    listRef.current?.recomputeRowHeights()
  }, [isTestnetMode, networkRowsWithChainInfoRows])

  const rowRenderer = useCallback(
    ({ index, style }: ListRowProps) => {
      const networkOrChainTypeName = networkRowsWithChainInfoRows[index]

      if (!networkOrChainTypeName) {
        return null
      }

      if (networkOrChainTypeName === ChainGroupName.core) {
        return (
          <ChainTypeInfoRow chainGroup={chainGroupInfo.core} style={style} />
        )
      }

      if (networkOrChainTypeName === ChainGroupName.orbit) {
        return (
          <ChainTypeInfoRow chainGroup={chainGroupInfo.orbit} style={style} />
        )
      }

      return (
        <NetworkRow
          key={networkOrChainTypeName}
          style={style}
          chainId={networkOrChainTypeName}
          onClick={onNetworkRowClick}
          close={close}
        />
      )
    },
    [close, networkRowsWithChainInfoRows, onNetworkRowClick]
  )

  const onSearchInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setErrorMessage('')
      setNetworkSearched(event.target.value)
    },
    []
  )

  return (
    <div className="flex flex-col gap-4">
      <SearchPanelTable
        searchInputPlaceholder="Search a network name"
        searchInputValue={networkSearched}
        onSearchInputChange={onSearchInputChange}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        errorMessage={errorMessage}
      >
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              width={width - 2}
              height={height}
              rowCount={networkRowsWithChainInfoRows.length}
              rowHeight={getRowHeight}
              rowRenderer={rowRenderer}
              listRef={listRef}
            />
          )}
        </AutoSizer>
      </SearchPanelTable>
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
    () => supportedNetworks.filter(network => isNetwork(network).isCoreChain),
    [supportedNetworks]
  )
  const orbitNetworks = useMemo(
    () => supportedNetworks.filter(network => isNetwork(network).isOrbitChain),
    [supportedNetworks]
  )

  const finalChainIds: ChainId[] = useMemo(
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
              <div className="flex items-center justify-end border-b border-b-black px-5 py-4 lg:hidden">
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
                >
                  <NetworksPanel
                    chainIds={finalChainIds}
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
