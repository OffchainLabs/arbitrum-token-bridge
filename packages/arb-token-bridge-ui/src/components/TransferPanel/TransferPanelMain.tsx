import React, { useEffect, useMemo, useState } from 'react'
import { ArrowsUpDownIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { BigNumber, utils } from 'ethers'
import { Chain, useAccount } from 'wagmi'
import { useMedia } from 'react-use'

import { Loader } from '../common/atoms/Loader'
import { useActions, useAppState } from '../../state'
import { formatAmount } from '../../util/NumberUtils'
import {
  ChainId,
  getExplorerUrl,
  getDestinationChainIds,
  isNetwork
} from '../../util/networks'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { useDestinationAddressStore } from './AdvancedSettings'
import { ExternalLink } from '../common/ExternalLink'
import { useDialog } from '../common/Dialog'

import { useAccountType } from '../../hooks/useAccountType'
import {
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  isTokenSepoliaUSDC,
  isTokenMainnetUSDC
} from '../../util/TokenUtils'
import { ether } from '../../constants'
import { NetworkListboxProps } from './NetworkListbox'
import { OneNovaTransferDialog } from './OneNovaTransferDialog'
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { TransferReadinessRichErrorMessage } from './useTransferReadinessUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { TransferDisabledDialog } from './TransferDisabledDialog'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { useUpdateUSDCTokenData } from './TransferPanelMain/hooks'
import { Balances } from '../../hooks/TransferPanel/useSelectedTokenBalances'
import { useBalances } from '../../hooks/useBalances'
import { DestinationNetworkBox } from './TransferPanelMain/DestinationNetworkBox'
import { SourceNetworkBox } from './TransferPanelMain/SourceNetworkBox'
import { NetworkType } from './TransferPanelMain/utils'

export function SwitchNetworksButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  const disabled = isSmartContractWallet || isLoadingAccountType

  const [networks, setNetworks] = useNetworks()

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
        {isSmartContractWallet ? (
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
  bgLogoHeight = 58,
  children
}: {
  network: Chain
  customAddress?: string
  bgLogoHeight?: number
  children: React.ReactNode
}) {
  const { address } = useAccount()
  const {
    color,
    network: { logo: networkLogo }
  } = getBridgeUiConfigForChain(network.id)
  const isSmallScreen = useMedia('(max-width: 639px)')

  const backgroundImage = `url(${networkLogo})`

  const walletAddressLowercased = address?.toLowerCase()

  const showCustomAddressBanner = useMemo(() => {
    if (!customAddress || !walletAddressLowercased) {
      return false
    }
    if (customAddress === walletAddressLowercased) {
      return false
    }
    return utils.isAddress(customAddress)
  }, [customAddress, walletAddressLowercased])

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
        <div
          className="absolute left-0 top-0 h-full w-full bg-[-2px_0] bg-no-repeat bg-origin-content p-3 opacity-50"
          style={{
            backgroundImage,
            backgroundSize: `auto ${bgLogoHeight + (isSmallScreen ? -12 : 0)}px`
          }}
        />
        <div className="relative space-y-3.5 bg-contain bg-no-repeat p-3 sm:flex-row">
          {children}
        </div>
      </div>
    </div>
  )
}

function StyledLoader() {
  return <Loader color="white" size="small" />
}

export function ETHBalance({
  balance,
  prefix = '',
  on
}: {
  balance: BigNumber | null
  prefix?: string
  on: NetworkType
}) {
  if (!balance) {
    return <StyledLoader />
  }

  return (
    <p>
      <span className="font-light">{prefix}</span>
      <span aria-label={`ETH balance amount on ${on}`}>
        {formatAmount(balance, { symbol: ether.symbol })}
      </span>
    </p>
  )
}

export function BalancesContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-nowrap items-end break-all text-sm tracking-[.25px] text-white sm:text-lg">
      {children}
    </div>
  )
}

export function NetworkListboxPlusBalancesContainer({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-row flex-wrap items-center justify-between gap-1 gap-y-2.5 whitespace-nowrap">
      {children}
    </div>
  )
}

export function TransferPanelMain({
  amount,
  errorMessage
}: {
  amount: string
  errorMessage?: TransferReadinessRichErrorMessage | string
}) {
  const actions = useActions()
  const [networks, setNetworks] = useNetworks()
  const { childChain, childChainProvider, isTeleportMode } =
    useNetworksRelationship(networks)

  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()
  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const {
    app: { selectedToken }
  } = useAppState()

  const { address: walletAddress } = useAccount()

  const { destinationAddress, setDestinationAddress } =
    useDestinationAddressStore()

  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const {
    ethParentBalance,
    erc20ParentBalances,
    updateErc20ParentBalances,
    ethChildBalance,
    updateErc20ChildBalances
  } = useBalances()

  const { updateUSDCBalances } = useUpdateUSDCBalances({
    walletAddress: destinationAddressOrWalletAddress
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
      updateUSDCBalances()
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
    updateUSDCBalances,
    isTeleportMode
  ])

  // TODO: move into a hook (FS-714)
  // when customFeeTokenBalances is moved to an independent hook file, use `setAmount` directly in useMaxAmount and do not pass `customFeeTokenBalances` as a prop
  const customFeeTokenBalances: Balances = useMemo(() => {
    if (!nativeCurrency.isCustom) {
      return { parentBalance: ethParentBalance, childBalance: ethChildBalance }
    }

    return {
      parentBalance: erc20ParentBalances?.[nativeCurrency.address] ?? null,
      childBalance: ethChildBalance
    }
  }, [nativeCurrency, ethParentBalance, ethChildBalance, erc20ParentBalances])

  const [oneNovaTransferDialogProps, openOneNovaTransferDialog] = useDialog()
  const [
    oneNovaTransferDestinationNetworkId,
    setOneNovaTransferDestinationNetworkId
  ] = useState<number | null>(null)

  const showUSDCSpecificInfo =
    !isTeleportMode &&
    ((isTokenMainnetUSDC(selectedToken?.address) && isArbitrumOne) ||
      (isTokenSepoliaUSDC(selectedToken?.address) && isArbitrumSepolia))

  useEffect(() => {
    // Different destination address only allowed for tokens
    if (!selectedToken) {
      setDestinationAddress(undefined)
    }
  }, [selectedToken, setDestinationAddress])

  useUpdateUSDCTokenData()

  type NetworkListboxesProps = {
    to: Omit<NetworkListboxProps, 'label'>
  }

  const networkListboxProps: NetworkListboxesProps = useMemo(() => {
    function getDestinationChains() {
      const destinationChainIds = getDestinationChainIds(
        networks.sourceChain.id
      )

      // if source chain is Arbitrum One, add Arbitrum Nova to destination
      if (networks.sourceChain.id === ChainId.ArbitrumOne) {
        destinationChainIds.push(ChainId.ArbitrumNova)
      }

      // if source chain is Arbitrum Nova, add Arbitrum One to destination
      if (networks.sourceChain.id === ChainId.ArbitrumNova) {
        destinationChainIds.push(ChainId.ArbitrumOne)
      }

      return (
        destinationChainIds
          // remove self
          .filter(chainId => chainId !== networks.destinationChain.id)
          .map(getWagmiChain)
      )
    }

    function shouldOpenOneNovaDialog(selectedChainIds: number[]) {
      return [ChainId.ArbitrumOne, ChainId.ArbitrumNova].every(chainId =>
        selectedChainIds.includes(chainId)
      )
    }

    const destinationChains = getDestinationChains()

    return {
      to: {
        disabled:
          isSmartContractWallet ||
          isLoadingAccountType ||
          destinationChains.length === 0,
        options: destinationChains,
        value: networks.destinationChain,
        onChange: async network => {
          if (shouldOpenOneNovaDialog([network.id, networks.sourceChain.id])) {
            setOneNovaTransferDestinationNetworkId(network.id)
            openOneNovaTransferDialog()
            return
          }

          setNetworks({
            sourceChainId: networks.sourceChain.id,
            destinationChainId: network.id
          })
          actions.app.setSelectedToken(null)
        }
      }
    }
  }, [
    isSmartContractWallet,
    isLoadingAccountType,
    networks.sourceChain,
    networks.destinationChain,
    setNetworks,
    openOneNovaTransferDialog
  ])

  return (
    <div className="flex flex-col pb-6 lg:gap-y-1">
      <SourceNetworkBox
        amount={amount}
        errorMessage={errorMessage}
        customFeeTokenBalances={customFeeTokenBalances}
        showUsdcSpecificInfo={showUSDCSpecificInfo}
      />

      <SwitchNetworksButton />

      <DestinationNetworkBox
        customFeeTokenBalances={customFeeTokenBalances}
        showUsdcSpecificInfo={showUSDCSpecificInfo}
        destinationNetworkListboxProps={networkListboxProps.to}
      />

      <TransferDisabledDialog />
      <OneNovaTransferDialog
        {...oneNovaTransferDialogProps}
        destinationChainId={oneNovaTransferDestinationNetworkId}
        amount={amount}
      />
    </div>
  )
}
