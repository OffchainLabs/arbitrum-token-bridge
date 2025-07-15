import React, { useEffect, useMemo } from 'react'
import { ArrowsUpDownIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { utils } from 'ethers'
import { isAddress } from 'viem'
import { useAccount } from 'wagmi'
import { Chain } from 'wagmi/chains'

import {
  getDestinationChainIds,
  getExplorerUrl,
  isNetwork
} from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'

import { useAccountType } from '../../hooks/useAccountType'
import {
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  isTokenSepoliaUSDC,
  isTokenMainnetUSDC
} from '../../util/TokenUtils'
import { useUpdateUsdcBalances } from '../../hooks/CCTP/useUpdateUsdcBalances'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { TransferDisabledDialog } from './TransferDisabledDialog'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { useUpdateUSDCTokenData } from './TransferPanelMain/hooks'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useBalances } from '../../hooks/useBalances'
import { DestinationNetworkBox } from './TransferPanelMain/DestinationNetworkBox'
import { SourceNetworkBox } from './TransferPanelMain/SourceNetworkBox'
import {
  DisabledFeatures,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'
import { addressesEqual } from '../../util/AddressUtils'
import { CustomMainnetChainWarning } from './CustomMainnetChainWarning'
import { getOrbitChains } from '../../util/orbitChainsList'
import { useMode } from '../../hooks/useMode'
import { useDisabledFeatures } from '../../hooks/useDisabledFeatures'

export function SwitchNetworksButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  const [networks, setNetworks] = useNetworks()

  const { isFeatureDisabled } = useDisabledFeatures()

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS
  )

  const isNetworkSwapBlocked = useMemo(() => {
    // block network swaps in case of either a smart contract wallet, or if the destination chain does not support transfers to the source-chain
    // in this case, we show a one-way arrow and disable the swap button
    return (
      isSmartContractWallet ||
      !getDestinationChainIds(
        networks.destinationChain.id,
        disableTransfersToNonArbitrumChains
      ).includes(networks.sourceChain.id)
    )
  }, [
    networks.destinationChain.id,
    networks.sourceChain.id,
    isSmartContractWallet,
    disableTransfersToNonArbitrumChains
  ])

  const disabled = isLoadingAccountType || isNetworkSwapBlocked

  return (
    <div className="z-[1] flex h-4 w-full items-center justify-center lg:h-1">
      <button
        type="button"
        disabled={disabled}
        className={twMerge(
          'group relative flex h-7 w-7 items-center justify-center rounded bg-gray-1 p-1',
          disabled && 'pointer-events-none'
        )}
        onClick={() => {
          setNetworks({
            sourceChainId: networks.destinationChain.id,
            destinationChainId: networks.sourceChain.id
          })
        }}
        aria-label="Switch Networks"
        {...props}
      >
        <SwitchNetworkButtonBorderTop />
        {isNetworkSwapBlocked ? (
          <ArrowDownIcon className="h-6 w-6 stroke-1 text-white" />
        ) : (
          <ArrowsUpDownIcon className="h-8 w-8 stroke-1 text-white transition duration-300 group-hover:rotate-180 group-hover:opacity-80" />
        )}
        <SwitchNetworkButtonBorderBottom />
      </button>
    </div>
  )
}

function SwitchNetworkButtonBorderTop() {
  const [networks] = useNetworks()

  const sourceNetworkColor = getBridgeUiConfigForChain(
    networks.sourceChain.id
  ).color

  return (
    <div
      className="absolute left-0 right-0 top-0 m-auto h-[7.5px] w-full rounded-t border-x border-t transition-[border-color] duration-200 lg:h-[10px]"
      style={{ borderColor: sourceNetworkColor }}
    />
  )
}

function SwitchNetworkButtonBorderBottom() {
  const [networks] = useNetworks()

  const destinationNetworkColor = getBridgeUiConfigForChain(
    networks.destinationChain.id
  ).color

  return (
    <div
      className="absolute bottom-0 left-0 right-0 m-auto h-[7.5px] w-full rounded-b border-x border-b transition-[border-color] duration-200 lg:h-[10px]"
      style={{ borderColor: destinationNetworkColor }}
    />
  )
}

function CustomAddressBanner({
  network,
  customAddress
}: {
  network: Chain
  customAddress: string | undefined
}) {
  const { color } = getBridgeUiConfigForChain(network.id)

  if (!customAddress) {
    return null
  }

  return (
    <div
      style={{
        backgroundColor: `${color}AA`,
        color: 'white',
        borderColor: color
      }}
      className={twMerge(
        'w-full rounded-t border border-b-0 p-2 text-center text-sm'
      )}
    >
      <span>
        Showing balance for{' '}
        <ExternalLink
          className="arb-hover underline"
          href={`${getExplorerUrl(network.id)}/address/${customAddress}`}
        >
          {customAddress}
        </ExternalLink>
      </span>
    </div>
  )
}

export function NetworkContainer({
  network,
  customAddress,
  children
}: {
  network: Chain
  customAddress?: string
  bgLogoHeight?: number
  children: React.ReactNode
}) {
  const { address: walletAddress } = useAccount()
  const { color } = getBridgeUiConfigForChain(network.id)

  const showCustomAddressBanner = useMemo(() => {
    if (!customAddress) {
      return false
    }
    if (addressesEqual(customAddress, walletAddress)) {
      return false
    }
    return utils.isAddress(customAddress)
  }, [customAddress, walletAddress])

  return (
    <div>
      {showCustomAddressBanner && (
        <CustomAddressBanner network={network} customAddress={customAddress} />
      )}
      <div
        style={{
          backgroundColor: `${color}66`, // 255*40% is 102, = 66 in hex
          borderColor: color
        }}
        className={twMerge(
          'relative rounded border transition-colors duration-400',
          showCustomAddressBanner && 'rounded-t-none'
        )}
      >
        <div className="absolute left-0 top-0 h-full w-full bg-[-2px_0] bg-no-repeat bg-origin-content p-3 opacity-50" />
        <div className="relative space-y-3.5 bg-contain bg-no-repeat p-3 sm:flex-row">
          {children}
        </div>
      </div>
    </div>
  )
}

export function TransferPanelMain() {
  const [networks] = useNetworks()
  const { parentChain, childChain, childChainProvider, isTeleportMode } =
    useNetworksRelationship(networks)

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const [selectedToken] = useSelectedToken()

  const { address: walletAddress } = useAccount()

  const [{ destinationAddress }] = useArbQueryParams()
  const { embedMode } = useMode()

  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const { updateErc20ParentBalances, updateErc20ChildBalances } = useBalances()

  const { updateUsdcBalances } = useUpdateUsdcBalances({
    walletAddress:
      destinationAddressOrWalletAddress &&
      isAddress(destinationAddressOrWalletAddress)
        ? destinationAddressOrWalletAddress
        : undefined
  })

  useEffect(() => {
    if (nativeCurrency.isCustom) {
      updateErc20ParentBalances([nativeCurrency.address])
    }
  }, [nativeCurrency, updateErc20ParentBalances])

  useEffect(() => {
    if (
      !selectedToken ||
      !destinationAddressOrWalletAddress ||
      !utils.isAddress(destinationAddressOrWalletAddress)
    ) {
      return
    }

    if (
      !isTeleportMode &&
      (isTokenMainnetUSDC(selectedToken.address) ||
        isTokenSepoliaUSDC(selectedToken.address) ||
        isTokenArbitrumOneNativeUSDC(selectedToken.address) ||
        isTokenArbitrumSepoliaNativeUSDC(selectedToken.address))
    ) {
      updateUsdcBalances()
      return
    }

    updateErc20ParentBalances([selectedToken.address])
    if (selectedToken.l2Address) {
      updateErc20ChildBalances([selectedToken.l2Address])
    }
  }, [
    selectedToken,
    updateErc20ParentBalances,
    updateErc20ChildBalances,
    destinationAddressOrWalletAddress,
    updateUsdcBalances,
    isTeleportMode
  ])

  const isCustomMainnetChain = useMemo(() => {
    const { isTestnet } = isNetwork(parentChain.id)
    const { isCoreChain: isChildCoreChain } = isNetwork(childChain.id)

    if (isTestnet || isChildCoreChain) {
      return false
    }

    // This will not include custom chains
    return !getOrbitChains().some(_chain => _chain.chainId === childChain.id)
  }, [parentChain, childChain])

  useUpdateUSDCTokenData()

  return (
    <div
      className={twMerge('flex flex-col pb-6 lg:gap-y-1', embedMode && 'pb-0')}
    >
      <SourceNetworkBox />

      <SwitchNetworksButton />

      <DestinationNetworkBox />

      {isCustomMainnetChain && <CustomMainnetChainWarning />}

      <TransferDisabledDialog />
    </div>
  )
}
