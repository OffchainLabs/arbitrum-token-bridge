import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { Chain } from 'wagmi/chains'
import { useDebounce } from '@uidotdev/usehooks'
import {
  ChevronDownIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { AutoSizer, List, ListRowProps } from 'react-virtualized'
import { hex } from 'wcag-contrast'

import { isNetwork, getNetworkName } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'
import { SearchPanel } from './SearchPanel/SearchPanel'
import { SearchPanelTable } from './SearchPanel/SearchPanelTable'
import { TestnetToggle } from './TestnetToggle'
import {
  DisabledFeatures,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { NetworkImage } from './NetworkImage'
import { Dialog, UseDialogProps, useDialog } from './Dialog'
import { useNetworks } from '../../hooks/useNetworks'
import { OneNovaTransferDialog } from '../TransferPanel/OneNovaTransferDialog'
import { shouldOpenOneNovaDialog } from '../TransferPanel/TransferPanelMain/utils'
import { useChainIdsForNetworkSelection } from '../../hooks/TransferPanel/useChainIdsForNetworkSelection'
import { useAccountType } from '../../hooks/useAccountType'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useDisabledFeatures } from '../../hooks/useDisabledFeatures'

type NetworkType = 'core' | 'more' | 'orbit'

enum ChainGroupName {
  core = 'CORE CHAINS',
  more = 'MORE CHAINS',
  orbit = 'ORBIT CHAINS'
}

type ChainGroupInfo = {
  name: ChainGroupName
  description?: React.ReactNode
}

const chainGroupInfo: { [key in NetworkType]: ChainGroupInfo } = {
  core: {
    name: ChainGroupName.core
  },
  more: {
    name: ChainGroupName.more,
    description: (
      <p className="mt-2 flex gap-1 whitespace-normal rounded bg-orange-dark px-2 py-1 text-xs text-orange">
        <ShieldExclamationIcon className="h-4 w-4 shrink-0" />
        <span>
          Independent projects using non-Arbitrum technology. These chains have
          varying degrees of decentralization.{' '}
          <span className="font-semibold">Bridge at your own risk.</span>
        </span>
      </p>
    )
  },
  orbit: {
    name: ChainGroupName.orbit,
    description: (
      <p className="mt-2 flex gap-1 whitespace-normal rounded bg-orange-dark px-2 py-1 text-xs text-orange">
        <ShieldExclamationIcon className="h-4 w-4 shrink-0" />
        <span>
          Independent projects using Arbitrum technology. Orbit chains have
          varying degrees of decentralization.{' '}
          <span className="font-semibold">Bridge at your own risk.</span>
        </span>
      </p>
    )
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
  const isOrbitGroup = chainGroup.name === ChainGroupName.orbit

  return (
    <div
      key={name}
      style={style}
      className={twMerge(
        'px-4 py-3',
        !isOrbitGroup &&
          'before:-mt-3 before:mb-3 before:block before:h-[1px] before:w-full before:bg-white/30 before:content-[""]'
      )}
    >
      <p className="text-sm text-white/70">{name}</p>
      {description}
    </div>
  )
}

export function NetworkButton({
  type,
  onClick
}: {
  type: 'source' | 'destination'
  onClick: () => void
}) {
  const [networks] = useNetworks()
  const { isSmartContractWallet, isLoading } = useAccountType()
  const isSource = type === 'source'
  const chains = useChainIdsForNetworkSelection({ isSource })
  const { isFeatureDisabled } = useDisabledFeatures()
  const allowSwitchingNetworkPair = !isFeatureDisabled(
    DisabledFeatures.SWITCHING_NETWORK_PAIR
  )

  const selectedChainId = isSource
    ? networks.sourceChain.id
    : networks.destinationChain.id

  const hasOneOrLessChain = chains.length <= 1

  const disabled =
    hasOneOrLessChain ||
    (isSmartContractWallet && type === 'source') ||
    isLoading ||
    !allowSwitchingNetworkPair

  const backgroundColor = getBridgeUiConfigForChain(selectedChainId).color

  const colorContrast = hex('#ffffff', backgroundColor)

  const buttonStyle = {
    backgroundColor,
    color: colorContrast >= 3 ? '#ffffff' : '#000000'
  }

  return (
    <button
      style={buttonStyle}
      className={twMerge(
        'arb-hover flex w-max items-center gap-1 rounded px-3 py-2 text-sm text-white outline-none md:gap-2 md:text-2xl'
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="max-w-[220px] truncate text-sm leading-[1.1] md:max-w-[250px] md:text-xl">
        {isSource ? 'From:' : 'To: '} {getNetworkName(selectedChainId)}
      </span>
      {!disabled && <ChevronDownIcon width={16} />}
    </button>
  )
}

function NetworkRow({
  chainId,
  isSelected,
  style,
  onClick,
  close
}: {
  chainId: ChainId
  isSelected: boolean
  style: CSSProperties
  onClick: (value: Chain) => void
  close: (focusableElement?: HTMLElement) => void
}) {
  const { network, nativeTokenData } = getBridgeUiConfigForChain(chainId)
  const chain = getWagmiChain(chainId)

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
        'flex h-[90px] w-full items-center gap-4 px-4 py-2 text-lg transition-[background] duration-200 hover:bg-white/10',
        isSelected && 'bg-white/10' // selected row
      )}
    >
      <NetworkImage
        chainId={chainId}
        className="h-[32px] w-[32px] p-[6px]"
        size={20}
      />
      <div className={twMerge('flex flex-col items-start gap-1')}>
        <span className="truncate leading-[1.1]">{network.name}</span>
        {network.description && (
          <p
            className="line-clamp-3 text-left text-xs leading-[1.15] text-white/70"
            title={network.description}
          >
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

function AddCustomOrbitChainButton({
  closeDialog
}: {
  closeDialog: (focusableElement?: HTMLElement) => void
}) {
  const [, setQueryParams] = useArbQueryParams()
  const [isTestnetMode] = useIsTestnetMode()

  const openSettingsPanel = () => {
    setQueryParams({ settingsOpen: true })
    closeDialog()
  }

  if (!isTestnetMode) {
    return null
  }

  return (
    <button className="arb-hover text-sm underline" onClick={openSettingsPanel}>
      <span>Add Custom Orbit Chain</span>
    </button>
  )
}

function NetworksPanel({
  chainIds,
  selectedChainId,
  onNetworkRowClick,
  close
}: {
  chainIds: ChainId[]
  selectedChainId: ChainId
  onNetworkRowClick: (value: Chain) => void
  close: (focusableElement?: HTMLElement) => void
}) {
  const [errorMessage, setErrorMessage] = useState('')
  const [networkSearched, setNetworkSearched] = useState('')
  const debouncedNetworkSearched = useDebounce(networkSearched, 200)
  const listRef = useRef<List>(null)
  const [isTestnetMode] = useIsTestnetMode()
  const [{ embedMode }] = useArbQueryParams()

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
      chainId => isNetwork(chainId).isCoreChain
    )
    const moreNetworks = chainIds.filter(
      chainId =>
        !isNetwork(chainId).isCoreChain && !isNetwork(chainId).isOrbitChain
    )
    const orbitNetworks = chainIds.filter(
      chainId => isNetwork(chainId).isOrbitChain
    )

    return {
      core: coreNetworks,
      more: moreNetworks,
      orbit: orbitNetworks
    }
  }, [debouncedNetworkSearched, chainIds])

  const isNetworkSearchResult = Array.isArray(networksToShow)

  const networkRowsWithChainInfoRows: (ChainId | ChainGroupName)[] =
    useMemo(() => {
      if (isNetworkSearchResult) {
        return networksToShow
      }

      const groupedNetworks = []

      if (networksToShow.core.length > 0) {
        groupedNetworks.push(ChainGroupName.core, ...networksToShow.core)
      }

      if (networksToShow.more.length > 0) {
        groupedNetworks.push(ChainGroupName.more, ...networksToShow.more)
      }

      if (networksToShow.orbit.length > 0) {
        groupedNetworks.push(ChainGroupName.orbit, ...networksToShow.orbit)
      }

      return groupedNetworks
    }, [isNetworkSearchResult, networksToShow])

  function getRowHeight({ index }: { index: number }) {
    const rowItemOrChainId = networkRowsWithChainInfoRows[index]
    if (!rowItemOrChainId) {
      return 0
    }
    if (typeof rowItemOrChainId === 'string') {
      return rowItemOrChainId === ChainGroupName.core ? 45 : 115
    }
    const rowItem = getBridgeUiConfigForChain(rowItemOrChainId)
    if (rowItem.network.description) {
      return 95
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

      if (networkOrChainTypeName === ChainGroupName.more) {
        return (
          <ChainTypeInfoRow chainGroup={chainGroupInfo.more} style={style} />
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
          isSelected={networkOrChainTypeName === selectedChainId}
          onClick={onNetworkRowClick}
          close={close}
        />
      )
    },
    [close, networkRowsWithChainInfoRows, onNetworkRowClick, selectedChainId]
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
        searchInputOnChange={onSearchInputChange}
        errorMessage={errorMessage}
        isDialog
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
      {!embedMode && (
        <div className="flex justify-between pb-2">
          <TestnetToggle label="Testnet mode" includeToggleStateOnLabel />
          <AddCustomOrbitChainButton closeDialog={close} />
        </div>
      )}
    </div>
  )
}

export const NetworkSelectionContainer = React.memo(
  (
    props: UseDialogProps & {
      type: 'source' | 'destination'
    }
  ) => {
    const [, setSelectedToken] = useSelectedToken()
    const [networks, setNetworks] = useNetworks()
    const [oneNovaTransferDialogProps, openOneNovaTransferDialog] = useDialog()
    const [, setQueryParams] = useArbQueryParams()

    const isSource = props.type === 'source'

    const selectedChainId = isSource
      ? networks.sourceChain.id
      : networks.destinationChain.id

    const supportedChainIds = useChainIdsForNetworkSelection({
      isSource
    })

    const onNetworkRowClick = useCallback(
      (value: Chain) => {
        const pairedChain = isSource ? 'destinationChain' : 'sourceChain'

        if (shouldOpenOneNovaDialog([value.id, networks[pairedChain].id])) {
          openOneNovaTransferDialog()
          return
        }

        if (networks[pairedChain].id === value.id) {
          setNetworks({
            sourceChainId: networks.destinationChain.id,
            destinationChainId: networks.sourceChain.id
          })
          return
        }

        // if changing sourceChainId, let the destinationId be the same, and let the `setNetworks` func decide whether it's a valid or invalid chain pair
        // this way, the destination doesn't reset to the default chain if the source chain is changed, and if both are valid
        setNetworks({
          sourceChainId: isSource ? value.id : networks.sourceChain.id,
          destinationChainId: isSource ? networks.destinationChain.id : value.id
        })

        setSelectedToken(null)
        setQueryParams({ destinationAddress: undefined })
      },
      [
        isSource,
        networks,
        setNetworks,
        setSelectedToken,
        setQueryParams,
        openOneNovaTransferDialog
      ]
    )

    return (
      <>
        <Dialog
          {...props}
          onClose={() => props.onClose(false)}
          title={`Select ${isSource ? 'Source' : 'Destination'} Network`}
          actionButtonProps={{ hidden: true }}
          isFooterHidden={true}
          className="h-screen overflow-hidden md:h-[calc(100vh_-_200px)] md:max-h-[900px] md:max-w-[500px]"
        >
          <SearchPanel>
            <SearchPanel.MainPage className="flex h-full max-w-[500px] flex-col py-4">
              <NetworksPanel
                chainIds={supportedChainIds}
                selectedChainId={selectedChainId}
                close={() => props.onClose(false)}
                onNetworkRowClick={onNetworkRowClick}
              />
            </SearchPanel.MainPage>
          </SearchPanel>
        </Dialog>
        <OneNovaTransferDialog {...oneNovaTransferDialogProps} />
      </>
    )
  }
)

NetworkSelectionContainer.displayName = 'NetworkSelectionContainer'
