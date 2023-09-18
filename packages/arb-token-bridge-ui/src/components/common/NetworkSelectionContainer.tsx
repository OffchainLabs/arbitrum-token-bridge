import { Popover, Transition } from '@headlessui/react'
import useLocalStorage from '@rehooks/local-storage'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { mainnet, useAccount, useNetwork } from 'wagmi'
import { useWindowSize } from 'react-use'

import {
  ChainId,
  getNetworkLogo,
  getNetworkName,
  getSupportedNetworks,
  isNetwork
} from '../../util/networks'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useAccountType } from '../../hooks/useAccountType'
import { testnetModeLocalStorageKey } from './SettingsDialog'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { TargetChainKey, getWalletConnectChain } from '../../util/wagmi/setup'
import { HeaderNetworkInformation } from './HeaderNetworkInformation'
import { HeaderNetworkNotSupported } from './HeaderNetworkNotSupported'

export const NetworkSelectionContainer = () => {
  const { chain = { ...mainnet, unsupported: false } } = useNetwork()
  const { isConnected } = useAccount()
  const [{ walletConnectChain }, setQueryParams] = useArbQueryParams()
  const [selectedChainId, setSelectedChainId] = useState(
    getWalletConnectChain(walletConnectChain) ?? chain.id
  )
  const { switchNetwork } = useSwitchNetworkWithConfig()
  const [isTestnetMode] = useLocalStorage<boolean>(testnetModeLocalStorageKey)

  const windowSize = useWindowSize()
  const isLgScreen = windowSize.width >= 1024

  const supportedNetworks = getSupportedNetworks(
    selectedChainId,
    !!isTestnetMode
  ).filter(chainId => chainId !== selectedChainId)

  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  const l1Networks = supportedNetworks.filter(
    network => isNetwork(network).isEthereum
  )
  const l2Networks = supportedNetworks.filter(
    network => isNetwork(network).isArbitrum
  )
  const orbitNetworks = supportedNetworks.filter(
    network => isNetwork(network).isOrbitChain
  )

  const finalNetworks: { id: string; title: string; networks: number[] }[] = []

  if (l1Networks.length > 0) {
    finalNetworks.push({ id: 'l1', title: 'L1', networks: l1Networks })
  }
  if (l2Networks.length > 0) {
    finalNetworks.push({ id: 'l2', title: 'L2', networks: l2Networks })
  }
  if (orbitNetworks.length > 0) {
    finalNetworks.push({ id: 'orbit', title: 'Orbit', networks: orbitNetworks })
  }

  const setWalletConnectChain = useCallback(
    (chainId: ChainId) => {
      const chainName = ChainId[chainId] as keyof typeof ChainId
      setQueryParams({
        walletConnectChain: TargetChainKey[chainName]
      })
    },
    [setQueryParams]
  )

  const handleClick = useCallback(
    (
      chainId: ChainId,
      close: (
        focusableElement?:
          | HTMLElement
          | React.MutableRefObject<HTMLElement | null>
          | undefined
      ) => void
    ) => {
      setSelectedChainId(chainId)
      if (isConnected) {
        switchNetwork?.(Number(chainId))
      } else {
        // this is to make sure it's run after `setSelectedChainId,
        // otherwise there'll be a race condition where the previous chain is used on reload
        setTimeout(() => window.location.reload(), 0)
      }
      close?.() //close the popover after option-click
    },
    [isConnected, switchNetwork]
  )

  useEffect(() => {
    if (isConnected) {
      // when user is connected, use wallet's chain
      setSelectedChainId(chain.id)
    }
    // When user was connected to an unsupported chain and disconnected
    // set mainnet as selected chain
    if (!isConnected && !walletConnectChain) {
      setSelectedChainId(ChainId.Mainnet)
    }
    setWalletConnectChain(selectedChainId)
  }, [
    chain,
    isConnected,
    selectedChainId,
    setWalletConnectChain,
    walletConnectChain
  ])

  return (
    <Popover className="relative z-50 w-full lg:w-max">
      <Popover.Button
        disabled={isSmartContractWallet || isLoadingAccountType}
        className="arb-hover flex w-full justify-start rounded-full px-6 py-3 lg:w-max lg:p-0"
      >
        {isConnected && chain.unsupported ? (
          <HeaderNetworkNotSupported />
        ) : (
          <HeaderNetworkInformation chainId={selectedChainId} />
        )}
      </Popover.Button>

      <Transition>
        <Popover.Panel className="relative flex w-full flex-col justify-between rounded-md lg:absolute lg:ml-1 lg:mt-1 lg:w-max lg:-translate-x-12 lg:flex-row lg:gap-3 lg:bg-white lg:p-2 lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {({ close }) => (
            <>
              {finalNetworks.map(networkType => (
                <div key={networkType.id} className="shrink-0">
                  {finalNetworks.length > 1 && (
                    // don't show the network type header if it's the only column
                    <div className="p-2 px-12 text-xl text-white lg:px-4 lg:text-dark">
                      {networkType.title}
                    </div>
                  )}

                  {networkType.networks.map(chainId => (
                    <button
                      key={chainId}
                      className="flex h-10 cursor-pointer flex-nowrap items-center justify-start space-x-3 px-12 text-lg font-light text-white hover:bg-gray-3 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-4 lg:px-4 lg:text-base lg:font-normal lg:text-dark"
                      onClick={() => {
                        handleClick(chainId, close)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.keyCode === 13) {
                          handleClick(chainId, close)
                        }
                      }}
                      type="button"
                      aria-label={`Switch to ${getNetworkName(
                        Number(chainId)
                      )}`}
                    >
                      <div className="flex h-6 w-6 items-center justify-center lg:h-6 lg:w-6">
                        <Image
                          src={getNetworkLogo(
                            Number(chainId),
                            isLgScreen ? 'dark' : 'light'
                          )}
                          alt={`${getNetworkName(Number(chainId))} logo`}
                          className="h-full w-auto"
                          width={24}
                          height={24}
                        />
                      </div>
                      <span className="max-w-[140px] truncate">
                        {getNetworkName(Number(chainId))}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
