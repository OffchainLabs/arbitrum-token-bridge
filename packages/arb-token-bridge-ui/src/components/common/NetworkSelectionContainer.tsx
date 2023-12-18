import { Popover, Transition } from '@headlessui/react'
import useLocalStorage from '@rehooks/local-storage'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useNetwork } from 'wagmi'
import { useDebounce, useWindowSize } from 'react-use'

import {
  getNetworkLogo,
  getNetworkName,
  getSupportedNetworks,
  isNetwork
} from '../../util/networks'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useAccountType } from '../../hooks/useAccountType'
import { testnetModeLocalStorageKey } from './SettingsDialog'
import { SearchPanel } from './SearchPanel/SearchPanel'
import { SearchPanelTable } from './SearchPanel/SearchPanelTable'
import { twMerge } from 'tailwind-merge'

type NetworkInfo = {
  chainId: number
  type: 'core' | 'orbit'
}

function NetworkRow({
  network,
  close
}: {
  network: NetworkInfo
  close: (focusableElement?: HTMLElement) => void
}) {
  const windowSize = useWindowSize()
  const isLgScreen = windowSize.width >= 1024
  const chainId = network.chainId
  const { switchNetwork } = useSwitchNetworkWithConfig()

  const handleClick = () => {
    switchNetwork?.(chainId)
    close() // close the popover after option-click
  }

  return (
    <button
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          handleClick()
        }
      }}
      key={chainId}
      type="button"
      aria-label={`Switch to ${getNetworkName(chainId)}`}
      className={twMerge('flex items-center justify-start gap-4 p-2 text-lg')}
    >
      <span className="flex h-6 w-6 items-center justify-center lg:h-6 lg:w-6">
        <Image
          src={getNetworkLogo(chainId, isLgScreen ? 'dark' : 'light')}
          alt={`${getNetworkName(chainId)} logo`}
          className="h-full w-auto"
          width={24}
          height={24}
        />
      </span>
      <span className="max-w-[140px] truncate">{getNetworkName(chainId)}</span>
    </button>
  )
}

function NetworksPanel({
  networks,
  close
}: {
  networks: NetworkInfo[]
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

  const networksToShow = useMemo(() => {
    const _networkSearched = debouncedNetworkSearched.trim().toLowerCase()

    if (_networkSearched) {
      return networks.filter(network => {
        const networkName = getNetworkName(network.chainId).toLowerCase()
        return networkName.includes(_networkSearched)
      })
    }

    return networks
  }, [debouncedNetworkSearched, networks])

  return (
    <SearchPanelTable
      searchInputPlaceholder="Search a network name"
      searchInputValue={networkSearched}
      onSearchInputChange={event => {
        setErrorMessage('')
        setNetworkSearched(event.target.value)
      }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      errorMessage={errorMessage}
      rowCount={networksToShow.length}
      rowHeight={84}
      rowRenderer={virtualizedProps => {
        const network = networksToShow[virtualizedProps.index]
        if (!network) {
          return null
        }
        // return finalNetworks.map(networkType => (
        //     <div key={networkType.id} className="shrink-0">
        //       {finalNetworks.length > 1 && (
        //         // don't show the network type header if it's the only column
        //         <div className="p-2 px-12 text-xl text-white lg:px-4 lg:text-dark">
        //           {networkType.title}
        //         </div>
        //       )}
        //     </div>
        //   ))

        return (
          <NetworkRow key={network.chainId} network={network} close={close} />
        )
      }}
    />
  )
}

export const NetworkSelectionContainer = ({
  children
}: {
  children: React.ReactNode
}) => {
  const { chain } = useNetwork()
  const [isTestnetMode] = useLocalStorage<boolean>(testnetModeLocalStorageKey)

  const supportedNetworks = getSupportedNetworks(
    chain?.id,
    !!isTestnetMode
  ).filter(chainId => chainId !== chain?.id)
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
    <Popover className="relative z-50 w-full lg:w-max">
      <Popover.Button
        disabled={isSmartContractWallet || isLoadingAccountType}
        className="arb-hover flex w-full justify-start rounded-full px-6 py-3 lg:w-max lg:p-0"
      >
        {children}
      </Popover.Button>

      <Transition>
        <Popover.Panel className="relative rounded-md lg:absolute lg:ml-1 lg:mt-1 lg:min-w-[448px] lg:-translate-x-12 lg:gap-3 lg:bg-white lg:p-5 lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {({ close }) => (
            <SearchPanel
              showCloseButton={false}
              SearchPanelSecondaryPage={null}
              mainPageTitle="Select Network"
              secondPageTitle="Networks"
              isLoading={false}
              loadingMessage="Fetching Networks..."
              bottomRightCTAtext="Manage networks"
            >
              <NetworksPanel networks={finalNetworks} close={close} />
            </SearchPanel>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
