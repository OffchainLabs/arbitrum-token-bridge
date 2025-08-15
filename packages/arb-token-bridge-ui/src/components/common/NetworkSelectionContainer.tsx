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
  ExclamationCircleIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { AutoSizer, List, ListRowProps } from 'react-virtualized'
import { isNetwork, getNetworkName } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'
import { SearchPanel } from './SearchPanel/SearchPanel'
import { SearchPanelTable } from './SearchPanel/SearchPanelTable'
import { TestnetToggle } from './TestnetToggle'
import {
  useArbQueryParams,
  DisabledFeatures
} from '../../hooks/useArbQueryParams'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { NetworkImage } from './NetworkImage'
import { useNetworks } from '../../hooks/useNetworks'
import { OneNovaTransferDialog } from '../TransferPanel/OneNovaTransferDialog'
import { shouldOpenOneNovaDialog } from '../TransferPanel/TransferPanelMain/utils'
import { useChainIdsForNetworkSelection } from '../../hooks/TransferPanel/useChainIdsForNetworkSelection'
import { useAccountType } from '../../hooks/useAccountType'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useDisabledFeatures } from '../../hooks/useDisabledFeatures'
import { useMode } from '../../hooks/useMode'
import { formatAmount } from '../../util/NumberUtils'
import { useNativeCurrencyBalanceForChainId } from '../../hooks/useNativeCurrencyBalanceForChainId'
import { useAccount } from 'wagmi'
import { Dialog, useDialog } from './Dialog'
import { DialogProps } from './Dialog2'
import { Button } from './Button'
import { Tooltip } from './Tooltip'
import { Loader } from './atoms/Loader'

type NetworkType = 'core' | 'more' | 'orbit'

enum ChainGroupName {
  core = 'Core Chains',
  more = 'More Chains',
  orbit = 'Orbit Chains'
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
  const isCoreGroup = chainGroup.name === ChainGroupName.core

  return (
    <div
      key={name}
      style={style}
      className={twMerge(
        'px-4 py-3',
        !isOrbitGroup &&
          'before:-mt-3 before:mb-3 before:block before:h-[1px] before:w-full before:bg-white/30 before:content-[""]',
        isCoreGroup && 'before:h-[0px]'
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
  const isNetworkSelectionDisabled = isFeatureDisabled(
    DisabledFeatures.NETWORK_SELECTION
  )

  const selectedChainId = isSource
    ? networks.sourceChain.id
    : networks.destinationChain.id

  const hasOneOrLessChain = chains.length <= 1

  const disabled =
    isNetworkSelectionDisabled ||
    hasOneOrLessChain ||
    (isSmartContractWallet && type === 'source') ||
    isLoading

  return (
    <Button variant="secondary" disabled={disabled} onClick={onClick}>
      <div className="flex flex-nowrap items-center gap-1 text-sm leading-[1.1]">
        {isSource ? 'From:' : 'To: '}
        <NetworkImage
          chainId={
            isSource ? networks.sourceChain.id : networks.destinationChain.id
          }
          className="h-[20px] w-[20px] p-[2px]"
          size={20}
        />
        {getNetworkName(selectedChainId)}
        {!disabled && <ChevronDownIcon width={12} />}
      </div>
    </Button>
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
  const { address: walletAddress } = useAccount()
  const {
    data: balanceState,
    isLoading: isLoadingBalance,
    error: balanceError
  } = useNativeCurrencyBalanceForChainId(chainId, walletAddress)

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
        'flex h-[40px] w-full items-center gap-4 rounded px-4 py-2 text-lg transition-[background] duration-200 hover:bg-white/10',
        isSelected && 'bg-white/10' // selected row
      )}
    >
      <NetworkImage
        chainId={chainId}
        className="h-[20px] w-[20px] p-[2px]"
        size={20}
      />
      <div
        className={twMerge(
          'flex w-full flex-row items-center justify-between gap-1'
        )}
      >
        <span className="truncate text-base">{network.name}</span>

        <p className="text-sm leading-none text-white/70">
          {!walletAddress && (
            <Tooltip
              content={`${
                nativeTokenData?.symbol ?? 'ETH'
              } is the native token`}
            >
              <p className="text-sm leading-none text-white/70">
                {nativeTokenData?.symbol ?? 'ETH'}
              </p>
            </Tooltip>
          )}

          {isLoadingBalance && <Loader size="small" />}

          {!isLoadingBalance && balanceError && (
            <Tooltip content="Error fetching balance">
              <div className="flex items-center gap-1">
                <ExclamationCircleIcon className="h-4 w-4 text-brick" />0{' '}
                {nativeTokenData?.symbol ?? 'ETH'}
              </div>
            </Tooltip>
          )}

          {balanceState && (
            <Tooltip
              content={`${
                nativeTokenData?.symbol ?? 'ETH'
              } is the native token`}
            >
              {formatAmount(balanceState.balance, {
                decimals: balanceState.decimals,
                symbol: balanceState.symbol
              })}
            </Tooltip>
          )}
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
  const { embedMode } = useMode()

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
      return 50
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
        searchInputPlaceholder="Search by network name"
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
    props: DialogProps & { isOpen: boolean } & {
      type: 'source' | 'destination'
    }
  ) => {
    const [, setSelectedToken] = useSelectedToken()
    const [networks, setNetworks] = useNetworks()
    const [oneNovaTransferDialogProps, openOneNovaTransferDialog] = useDialog()
    const [, setQueryParams] = useArbQueryParams()
    const { embedMode } = useMode()

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
          isOpen={props.isOpen}
          onClose={() => props.onClose(false)}
          title={`Select ${isSource ? 'Source' : 'Destination'} Network`}
          actionButtonProps={{ hidden: true }}
          isFooterHidden={true}
          className={twMerge(
            'h-screen overflow-hidden md:h-[calc(100vh_-_175px)] md:max-h-[900px] md:max-w-[500px]',
            embedMode && 'md:h-full'
          )}
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
