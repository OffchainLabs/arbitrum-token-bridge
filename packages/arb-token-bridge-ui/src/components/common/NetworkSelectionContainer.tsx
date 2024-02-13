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
import { useDebounce } from '@uidotdev/usehooks'
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
}

const chainGroupInfo: { [key in NetworkType]: ChainGroupInfo } = {
  core: {
    name: ChainGroupName.core
  },
  orbit: {
    name: ChainGroupName.orbit
  }
}

function ChainTypeInfoRow({
  chainGroup,
  style
}: {
  chainGroup: ChainGroupInfo
  style: CSSProperties
}) {
  const { name } = chainGroup
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
      <p className="text-sm text-white/70">{name}</p>
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

  return (
    <button
      onClick={handleClick}
      key={chainId}
      style={style}
      type="button"
      aria-label={`Switch to ${network.name}`}
      className={twMerge(
        'flex h-[90px] w-full items-center gap-4 px-4 py-2 text-lg hover:bg-white/10',
        chainId === sourceChain.id && 'bg-white/10' // selected row
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
        <span className="truncate leading-[1.1]">{network.name}</span>
        {network.description && (
          <p className="whitespace-pre-wrap text-left text-xs leading-[1.15] text-white/70">
            {network.description}
          </p>
        )}
        <p className="text-[10px] leading-none text-white/50">
          {nativeTokenData?.symbol ?? 'ETH'} is the native gas token
        </p>
      </div>
    </button>
  )
}

function AddCustomOrbitChainButton() {
  const [, setQueryParams] = useArbQueryParams()
  const [isTestnetMode] = useIsTestnetMode()

  const openSettingsPanel = () => setQueryParams({ settingsOpen: true })

  if (!isTestnetMode) {
    return null
  }

  return (
    <button className="text-sm underline" onClick={openSettingsPanel}>
      <span>Add Custom Orbit Chain</span>
    </button>
  )
}

function NetworksPanel({
  onNetworkRowClick,
  close
}: {
  onNetworkRowClick: (value: Chain) => void
  close: (focusableElement?: HTMLElement) => void
}) {
  const [errorMessage, setErrorMessage] = useState('')
  const [networkSearched, setNetworkSearched] = useState('')
  const debouncedNetworkSearched = useDebounce(networkSearched, 200)
  const listRef = useRef<List>(null)
  const [isTestnetMode] = useIsTestnetMode()

  const chainIds = useMemo(
    () =>
      getSupportedChainIds({
        includeMainnets: !isTestnetMode,
        includeTestnets: isTestnetMode
      }),
    [isTestnetMode]
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
      return 45
    }
    const rowItem = getBridgeUiConfigForChain(rowItemOrChainId)
    if (rowItem.network.description) {
      return 90
    }
    return 60
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
        searchInput={{
          placeholder: 'Search a network name',
          value: networkSearched,
          onChange: onSearchInputChange
        }}
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
        <TestnetToggle label="Testnet mode" />
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
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

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
            <SearchPanel>
              <SearchPanel.MainPage className="flex h-full flex-col px-5 py-4">
                <SearchPanel.PageTitle title="Select Network">
                  <SearchPanel.CloseButton onClick={onClose} />
                </SearchPanel.PageTitle>
                <NetworksPanel close={onClose} onNetworkRowClick={onChange} />
              </SearchPanel.MainPage>
            </SearchPanel>
          )
        }}
      </Popover.Panel>
    </Popover>
  )
}
