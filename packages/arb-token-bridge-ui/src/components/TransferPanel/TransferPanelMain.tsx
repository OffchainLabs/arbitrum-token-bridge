import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import { Loader } from '../common/atoms/Loader'
import { twMerge } from 'tailwind-merge'
import { BigNumber, constants, utils } from 'ethers'
import { Chain, useAccount } from 'wagmi'

import { useActions, useAppState } from '../../state'
import { formatAmount } from '../../util/NumberUtils'
import {
  ChainId,
  getExplorerUrl,
  getL2ChainIds,
  getNetworkName,
  getSupportedNetworks,
  isNetwork
} from '../../util/networks'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { useDestinationAddressStore } from './AdvancedSettings'
import { ExternalLink } from '../common/ExternalLink'
import { useDialog } from '../common/Dialog'
import {
  AmountQueryParamEnum,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'

import { TransferPanelMainInput } from './TransferPanelMainInput'
import {
  calculateEstimatedL1GasFees,
  calculateEstimatedL2GasFees
} from './TransferPanelMainUtils'
import { useBalance } from '../../hooks/useBalance'
import { useGasPrice } from '../../hooks/useGasPrice'
import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types'
import { useAccountType } from '../../hooks/useAccountType'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { withdrawInitTxEstimateGas } from '../../util/WithdrawalUtils'
import { GasEstimates } from '../../hooks/arbTokenBridge.types'
import { CommonAddress } from '../../util/CommonAddressUtils'
import {
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  isTokenSepoliaUSDC,
  isTokenMainnetUSDC
} from '../../util/TokenUtils'
import {
  ETH_BALANCE_ARTICLE_LINK,
  USDC_LEARN_MORE_LINK,
  ether
} from '../../constants'
import { NetworkListbox, NetworkListboxProps } from './NetworkListbox'
import { shortenAddress } from '../../util/CommonUtils'
import { OneNovaTransferDialog } from './OneNovaTransferDialog'
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'
import {
  useNativeCurrency,
  NativeCurrencyErc20
} from '../../hooks/useNativeCurrency'
import { defaultErc20Decimals } from '../../defaults'
import { EstimatedGas } from './EstimatedGas'
import { TransferReadinessRichErrorMessage } from './useTransferReadinessUtils'
import { TokenSymbolWithExplorerLink } from '../common/TokenSymbolWithExplorerLink'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import {
  TransferDisabledDialog,
  useTransferDisabledDialogStore
} from './TransferDisabledDialog'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'

enum NetworkType {
  l1 = 'l1',
  l2 = 'l2'
}

export function SwitchNetworksButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const {
    isEOA,
    isSmartContractWallet,
    isLoading: isLoadingAccountType
  } = useAccountType()

  return (
    <button
      type="button"
      disabled={isSmartContractWallet || isLoadingAccountType}
      className={twMerge(
        'min-h-14 lg:min-h-16 min-w-14 lg:min-w-16 flex h-14 w-14 items-center justify-center rounded-full bg-white p-3 shadow-[0_0_4px_0_rgba(0,0,0,0.25)] transition duration-200 lg:h-16 lg:w-16 lg:p-4',
        isEOA
          ? 'hover:animate-rotate-180 focus-visible:animate-rotate-180 hover:bg-gray-1 focus-visible:ring-2 focus-visible:ring-gray-4 active:bg-gray-2'
          : ''
      )}
      {...props}
    >
      {isSmartContractWallet ? (
        <ChevronDownIcon className="text-dark" />
      ) : (
        <ArrowsUpDownIcon className="text-dark" />
      )}
    </button>
  )
}

function getListboxOptionsFromL1Network(chainId: ChainId) {
  return getL2ChainIds(chainId).map(l2ChainId => getWagmiChain(l2ChainId))
}

function CustomAddressBanner({
  network,
  customAddress
}: {
  network: Chain
  customAddress: string | undefined
}) {
  const { isArbitrum, isArbitrumNova, isOrbitChain } = isNetwork(network.id)
  const { primaryColor, secondaryColor } = getBridgeUiConfigForChain(network.id)

  const backgroundColorForL1OrL2Chain = useMemo(() => {
    if (isOrbitChain) {
      return ''
    }
    if (!isArbitrum) {
      return 'bg-cyan'
    }
    if (isArbitrumNova) {
      return 'bg-orange'
    }
    return 'bg-cyan'
  }, [isArbitrum, isArbitrumNova, isOrbitChain])

  if (!customAddress) {
    return null
  }

  return (
    <div
      style={{
        backgroundColor: isOrbitChain
          ? // add opacity to create a lighter shade
            `${primaryColor}20`
          : undefined,
        color: secondaryColor,
        borderColor: secondaryColor
      }}
      className={twMerge(
        'w-full rounded-t-lg border-4 p-1 text-center text-sm',
        !isOrbitChain && backgroundColorForL1OrL2Chain
      )}
    >
      <span>
        Showing balance for Custom Destination Address:{' '}
        <ExternalLink
          className="arb-hover underline"
          href={`${getExplorerUrl(network.id)}/address/${customAddress}`}
        >
          {shortenAddress(customAddress)}
        </ExternalLink>
      </span>
    </div>
  )
}

function NetworkContainer({
  network,
  customAddress,
  children
}: {
  network: Chain
  customAddress?: string
  children: React.ReactNode
}) {
  const { address } = useAccount()
  const { secondaryColor, networkLogo } = getBridgeUiConfigForChain(network.id)

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
    <>
      {showCustomAddressBanner && (
        <CustomAddressBanner network={network} customAddress={customAddress} />
      )}
      <div
        style={{ backgroundColor: secondaryColor }}
        className={twMerge(
          'relative rounded-xl p-1 transition-colors',
          showCustomAddressBanner ? 'rounded-t-none' : ''
        )}
      >
        <div
          className="absolute left-0 top-0 z-0 h-full w-full bg-contain bg-left bg-no-repeat bg-origin-content p-2 opacity-50"
          style={{ backgroundImage }}
        ></div>
        <div className="relative space-y-3.5 bg-contain bg-no-repeat p-3 sm:flex-row lg:p-2">
          {children}
        </div>
      </div>
    </>
  )
}

function StyledLoader() {
  return <Loader color="white" size="small" />
}

function ETHBalance({
  balance,
  prefix = ''
}: {
  balance: BigNumber | null
  prefix?: string
}) {
  if (!balance) {
    return <StyledLoader />
  }

  return (
    <p>
      <span className="font-light">{prefix}</span>
      <span className="tabular-nums">
        {formatAmount(balance, { symbol: ether.symbol })}
      </span>
    </p>
  )
}

function TokenBalance({
  forToken,
  balance,
  on,
  prefix = '',
  tokenSymbolOverride
}: {
  forToken: ERC20BridgeToken | NativeCurrencyErc20 | null
  balance: BigNumber | null
  on: NetworkType
  prefix?: string
  tokenSymbolOverride?: string
}) {
  const isParentChain = on === NetworkType.l1

  if (!forToken) {
    return null
  }

  if (!balance) {
    return <StyledLoader />
  }

  return (
    <p aria-label={`${forToken.symbol} balance on ${on}`}>
      <span className="font-light">{prefix}</span>
      <span className="tabular-nums">
        {formatAmount(balance, {
          decimals: forToken.decimals
        })}
      </span>{' '}
      <TokenSymbolWithExplorerLink
        token={forToken}
        tokenSymbolOverride={tokenSymbolOverride}
        isParentChain={isParentChain}
      />
    </p>
  )
}

function BalancesContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-1 flex flex-col flex-nowrap items-end break-all text-sm tracking-[.25px] text-white md:text-lg">
      {children}
    </div>
  )
}

function NetworkListboxPlusBalancesContainer({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-1 gap-y-2.5 whitespace-nowrap sm:flex-row sm:items-center">
      {children}
    </div>
  )
}

export function TransferPanelMain({
  amount,
  setAmount,
  errorMessage
}: {
  amount: string
  setAmount: (value: string) => void
  errorMessage?: TransferReadinessRichErrorMessage | string
}) {
  const actions = useActions()
  const [networks, setNetworks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChain,
    parentChainProvider,
    isDepositMode
  } = useNetworksRelationship(networks)

  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id)
  const { isSmartContractWallet } = useAccountType()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const l1GasPrice = useGasPrice({ provider: parentChainProvider })
  const l2GasPrice = useGasPrice({ provider: childChainProvider })

  const { app } = useAppState()
  const { address: walletAddress } = useAccount()
  const { arbTokenBridge, selectedToken } = app
  const { token } = arbTokenBridge

  const { destinationAddress, setDestinationAddress } =
    useDestinationAddressStore()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const l1WalletAddress = isDepositMode
    ? walletAddress
    : destinationAddressOrWalletAddress

  const l2WalletAddress = isDepositMode
    ? destinationAddressOrWalletAddress
    : walletAddress

  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances, updateErc20L1Balances]
  } = useBalance({
    provider: parentChainProvider,
    walletAddress: l1WalletAddress
  })
  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances, updateErc20L2Balances]
  } = useBalance({
    provider: childChainProvider,
    walletAddress: l2WalletAddress
  })
  const { updateUSDCBalances } = useUpdateUSDCBalances({
    walletAddress: destinationAddressOrWalletAddress
  })
  const [isTestnetMode] = useIsTestnetMode()

  useEffect(() => {
    if (nativeCurrency.isCustom) {
      updateErc20L1Balances([nativeCurrency.address])
    }
  }, [nativeCurrency, updateErc20L1Balances])

  useEffect(() => {
    if (
      !selectedToken ||
      !destinationAddressOrWalletAddress ||
      !utils.isAddress(destinationAddressOrWalletAddress)
    ) {
      return
    }

    if (
      isTokenMainnetUSDC(selectedToken.address) ||
      isTokenSepoliaUSDC(selectedToken.address) ||
      isTokenArbitrumOneNativeUSDC(selectedToken.address) ||
      isTokenArbitrumSepoliaNativeUSDC(selectedToken.address)
    ) {
      updateUSDCBalances(selectedToken.address)
      return
    }

    updateErc20L1Balances([selectedToken.address])
    if (selectedToken.l2Address) {
      updateErc20L2Balances([selectedToken.l2Address])
    }
  }, [
    selectedToken,
    updateErc20L1Balances,
    updateErc20L2Balances,
    destinationAddressOrWalletAddress,
    updateUSDCBalances
  ])

  type Balances = {
    l1: BigNumber | null
    l2: BigNumber | null
  }

  const customFeeTokenBalances: Balances = useMemo(() => {
    if (!nativeCurrency.isCustom) {
      return { l1: ethL1Balance, l2: ethL2Balance }
    }

    return {
      l1: erc20L1Balances?.[nativeCurrency.address] ?? null,
      l2: ethL2Balance
    }
  }, [nativeCurrency, ethL1Balance, ethL2Balance, erc20L1Balances])

  const selectedTokenBalances: Balances = useMemo(() => {
    const result: Balances = {
      l1: null,
      l2: null
    }

    if (!selectedToken) {
      return result
    }

    if (erc20L1Balances) {
      result.l1 = erc20L1Balances[selectedToken.address] ?? null
    }

    if (erc20L2Balances && selectedToken.l2Address) {
      result.l2 = erc20L2Balances[selectedToken.l2Address] ?? null
    }

    if (
      isTokenArbitrumOneNativeUSDC(selectedToken.address) &&
      erc20L1Balances &&
      erc20L2Balances
    ) {
      return {
        l1: erc20L1Balances[CommonAddress.Ethereum.USDC] ?? null,
        l2: erc20L2Balances[selectedToken.address] ?? null
      }
    }
    if (
      isTokenArbitrumSepoliaNativeUSDC(selectedToken.address) &&
      erc20L1Balances &&
      erc20L2Balances
    ) {
      return {
        l1: erc20L1Balances[CommonAddress.Sepolia.USDC] ?? null,
        l2: erc20L2Balances[selectedToken.address] ?? null
      }
    }

    return result
  }, [erc20L1Balances, erc20L2Balances, selectedToken])

  const [loadingMaxAmount, setLoadingMaxAmount] = useState(false)
  const { openDialog: openTransferDisabledDialog } =
    useTransferDisabledDialogStore()
  const [oneNovaTransferDialogProps, openOneNovaTransferDialog] = useDialog()
  const [
    oneNovaTransferDestinationNetworkId,
    setOneNovaTransferDestinationNetworkId
  ] = useState<number | null>(null)
  const isMaxAmount = amount === AmountQueryParamEnum.MAX

  const showUSDCSpecificInfo =
    (isTokenMainnetUSDC(selectedToken?.address) && isArbitrumOne) ||
    (isTokenSepoliaUSDC(selectedToken?.address) && isArbitrumSepolia)

  const [, setQueryParams] = useArbQueryParams()

  const estimateGas = useCallback(
    async (
      weiValue: BigNumber
    ): Promise<
      | GasEstimates & {
          estimatedL2SubmissionCost: BigNumber
        }
    > => {
      if (!walletAddress) {
        return {
          estimatedL1Gas: constants.Zero,
          estimatedL2Gas: constants.Zero,
          estimatedL2SubmissionCost: constants.Zero
        }
      }

      if (isDepositMode) {
        const result = await depositEthEstimateGas({
          amount: weiValue,
          address: walletAddress,
          l1Provider: parentChainProvider,
          l2Provider: childChainProvider
        })
        return result
      }

      const result = await withdrawInitTxEstimateGas({
        amount: weiValue,
        address: walletAddress,
        l2Provider: childChainProvider
      })

      return { ...result, estimatedL2SubmissionCost: constants.Zero }
    },
    [walletAddress, isDepositMode, childChainProvider, parentChainProvider]
  )

  const setMaxAmount = useCallback(async () => {
    if (selectedToken) {
      const tokenBalance = isDepositMode
        ? selectedTokenBalances.l1
        : selectedTokenBalances.l2

      if (tokenBalance) {
        // For token deposits and withdrawals, we can set the max amount, as gas fees are paid in ETH / custom fee token
        setAmount(
          utils.formatUnits(
            tokenBalance,
            selectedToken?.decimals ?? defaultErc20Decimals
          )
        )
      }

      return
    }

    const customFeeTokenL1Balance = customFeeTokenBalances.l1
    // For custom fee token deposits, we can set the max amount, as the fees will be paid in ETH
    if (nativeCurrency.isCustom && isDepositMode && customFeeTokenL1Balance) {
      setAmount(
        utils.formatUnits(customFeeTokenL1Balance, nativeCurrency.decimals)
      )
      return
    }

    // We have already handled token deposits and deposits of the custom fee token
    // The remaining cases are ETH deposits, and ETH/custom fee token withdrawals (which can be handled in the same case)
    const nativeCurrencyBalance = isDepositMode ? ethL1Balance : ethL2Balance

    if (!nativeCurrencyBalance) {
      return
    }

    try {
      setLoadingMaxAmount(true)
      const result = await estimateGas(nativeCurrencyBalance)

      /**
       * For a withdrawal init tx, the L1 gas fee is hardcoded to `0` as all fees are paid on L2.
       *
       * The actual fee breakdown includes L1 batch posting fee and L2 execution cost, where `L1 batch posting fee = gasEstimateForL1 * L2 gas price`
       * @see
       * {@link https://github.com/Offchainlabs/arbitrum-docs/blob/1bd3b9beb0858725d0faafa188cd13d32f642f9c/arbitrum-docs/devs-how-tos/how-to-estimate-gas.mdx#L125 | Documentation}
       */
      const estimatedL1GasFees = calculateEstimatedL1GasFees(
        result.estimatedL1Gas,
        l1GasPrice
      )
      const estimatedL2GasFees = calculateEstimatedL2GasFees(
        result.estimatedL2Gas,
        l2GasPrice,
        result.estimatedL2SubmissionCost
      )

      const nativeCurrencyBalanceFloat = parseFloat(
        utils.formatUnits(nativeCurrencyBalance, nativeCurrency.decimals)
      )
      const estimatedTotalGasFees = estimatedL1GasFees + estimatedL2GasFees
      const maxAmount = nativeCurrencyBalanceFloat - estimatedTotalGasFees * 1.4
      // make sure it's always a positive number
      // if it's negative, set it to user's balance to show insufficient for gas error
      setAmount(String(maxAmount > 0 ? maxAmount : nativeCurrencyBalanceFloat))
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingMaxAmount(false)
    }
  }, [
    nativeCurrency,
    estimateGas,
    ethL1Balance,
    ethL2Balance,
    isDepositMode,
    l1GasPrice,
    l2GasPrice,
    selectedToken,
    setAmount,
    selectedTokenBalances,
    customFeeTokenBalances
  ])

  // whenever the user changes the `amount` input, it should update the amount in browser query params as well
  useEffect(() => {
    setQueryParams({ amount })

    if (isMaxAmount) {
      setMaxAmount()
    }
  }, [amount, isMaxAmount, setMaxAmount, setQueryParams])

  useEffect(() => {
    // Different destination address only allowed for tokens
    if (!selectedToken) {
      setDestinationAddress(undefined)
    }
  }, [selectedToken, setDestinationAddress])

  const maxButtonVisible = useMemo(() => {
    const ethBalance = isDepositMode ? ethL1Balance : ethL2Balance
    const tokenBalance = isDepositMode
      ? selectedTokenBalances.l1
      : selectedTokenBalances.l2

    if (selectedToken) {
      if (!tokenBalance) {
        return false
      }

      return !tokenBalance.isZero()
    }

    if (!ethBalance) {
      return false
    }

    return !ethBalance.isZero()
  }, [
    ethL1Balance,
    ethL2Balance,
    selectedTokenBalances,
    selectedToken,
    isDepositMode
  ])

  const errorMessageElement = useMemo(() => {
    if (typeof errorMessage === 'undefined') {
      return undefined
    }

    if (typeof errorMessage === 'string') {
      return errorMessage
    }

    switch (errorMessage) {
      case TransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE:
        return (
          <span>
            Gas estimation failed, join our{' '}
            <ExternalLink
              href="https://discord.com/invite/ZpZuw7p"
              className="underline"
            >
              Discord
            </ExternalLink>{' '}
            and reach out in #support for assistance.
          </span>
        )

      case TransferReadinessRichErrorMessage.TOKEN_WITHDRAW_ONLY:
      case TransferReadinessRichErrorMessage.TOKEN_TRANSFER_DISABLED:
        return (
          <>
            <span>This token can&apos;t be bridged over.</span>{' '}
            <button
              className="arb-hover underline"
              onClick={openTransferDisabledDialog}
            >
              Learn more.
            </button>
          </>
        )
    }
  }, [errorMessage, openTransferDisabledDialog])

  const switchNetworksOnTransferPanel = useCallback(() => {
    setNetworks({
      sourceChainId: networks.destinationChain.id,
      destinationChainId: networks.sourceChain.id
    })
  }, [networks.destinationChain.id, networks.sourceChain.id, setNetworks])

  useEffect(() => {
    const isArbOneUSDC = isTokenArbitrumOneNativeUSDC(selectedToken?.address)
    const isArbSepoliaUSDC = isTokenArbitrumSepoliaNativeUSDC(
      selectedToken?.address
    )
    // If user select native USDC on L2, when switching to deposit mode,
    // we need to default to set the corresponding USDC on L1
    if (!isDepositMode) {
      return
    }

    // When switching network, token might be undefined
    if (!token) {
      return
    }

    const commonUSDC = {
      name: 'USD Coin',
      type: TokenType.ERC20,
      symbol: 'USDC',
      decimals: 6,
      listIds: new Set<number>()
    }
    if (isArbOneUSDC) {
      token.updateTokenData(CommonAddress.Ethereum.USDC)
      actions.app.setSelectedToken({
        ...commonUSDC,
        address: CommonAddress.Ethereum.USDC,
        l2Address: CommonAddress.ArbitrumOne['USDC.e']
      })
    } else if (isArbSepoliaUSDC) {
      token.updateTokenData(CommonAddress.Sepolia.USDC)
      actions.app.setSelectedToken({
        ...commonUSDC,
        address: CommonAddress.Sepolia.USDC,
        l2Address: CommonAddress.ArbitrumSepolia['USDC.e']
      })
    }
  }, [actions.app, isDepositMode, selectedToken, token])

  type NetworkListboxesProps = {
    from: Omit<NetworkListboxProps, 'label'>
    to: Omit<NetworkListboxProps, 'label'>
  }

  const networkListboxProps: NetworkListboxesProps = useMemo(() => {
    function modifyOptions(selectedChainId: ChainId, direction: 'from' | 'to') {
      const {
        isOrbitChain: isSourceOrbitChain,
        isArbitrumNova: isSourceArbitrumNova
      } = isNetwork(networks.sourceChain.id)
      const {
        isOrbitChain: isDestinationOrbitChain,
        isArbitrumNova: isDestinationArbitrumNova
      } = isNetwork(networks.destinationChain.id)
      const { isArbitrum: isSelectedArbitrumChain } = isNetwork(selectedChainId)
      const options = getListboxOptionsFromL1Network(parentChain.id)

      // Add parent network to the list
      return [parentChain, ...options].filter(option => {
        const isSourceChainList = direction === 'from'
        const isDestinationChainList = direction === 'to'
        const isSameAsSourceChain = option.id === networks.sourceChain.id
        const isSameAsDestinationChain =
          option.id === networks.destinationChain.id
        const { isEthereumMainnetOrTestnet, isOrbitChain } = isNetwork(
          option.id
        )
        // Remove the origin network from the destination list for contract wallets
        // It's done so that the origin network is not changed
        if (
          isSmartContractWallet &&
          isDestinationChainList &&
          isSameAsSourceChain
        ) {
          return false
        }

        // Do not display Orbit chains for Nova
        if (isOrbitChain && isSourceChainList && isDestinationArbitrumNova) {
          return false
        }

        if (isOrbitChain && isDestinationChainList && isSourceArbitrumNova) {
          return false
        }

        // If this is the Source network list options
        // and the selected source is an Arbitrum Base chain
        // we don't show Orbit chains except for the current Destination Orbit chain on the same dropdown
        if (
          isSelectedArbitrumChain &&
          isSourceChainList &&
          isOrbitChain &&
          !isSameAsDestinationChain
        ) {
          return false
        }

        // If this is the Destination network list options
        // and the selected destination is an Arbitrum chain
        // we don't show Orbit chains except for the current Source Orbit chain on the same dropdown
        if (
          isSelectedArbitrumChain &&
          isDestinationChainList &&
          isOrbitChain &&
          !isSameAsSourceChain
        ) {
          return false
        }

        // If the source chain is an Orbit Chain,
        // and this is the Destination network list options
        if (isSourceOrbitChain && isDestinationChainList) {
          // we do not show Ethereum Mainnet or Testnet as options
          if (isEthereumMainnetOrTestnet) {
            return false
          }
          // we do not show other Orbit chains as options
          if (isOrbitChain && !isSameAsSourceChain) {
            return false
          }
        }

        // If the destination chain is an Orbit Chain,
        // and this is the Source network list options
        if (isDestinationOrbitChain && isSourceChainList) {
          // we do not show Ethereum Mainnet or Testnet as options
          if (isEthereumMainnetOrTestnet) {
            return false
          }
          // we do not show other Orbit chains as options
          if (isOrbitChain && !isSameAsDestinationChain) {
            return false
          }
        }

        // Remove selected network from the list
        return option.id !== selectedChainId
      })
    }

    const fromOptions = getSupportedNetworks(
      networks.sourceChain.id,
      !!isTestnetMode
    )
      .filter(chainId => chainId !== networks.sourceChain.id)
      .map(chainId => getWagmiChain(chainId))
    const toOptions = modifyOptions(networks.destinationChain.id, 'to')

    function shouldOpenOneNovaDialog(selectedChainIds: number[]) {
      return [ChainId.ArbitrumOne, ChainId.ArbitrumNova].every(chainId =>
        selectedChainIds.includes(chainId)
      )
    }

    if (isDepositMode) {
      return {
        from: {
          disabled:
            !fromOptions.length ||
            isSmartContractWallet ||
            typeof isSmartContractWallet === 'undefined',
          options: fromOptions,
          value: networks.sourceChain,
          onChange: async network => {
            if (
              shouldOpenOneNovaDialog([
                network.id,
                networks.destinationChain.id
              ])
            ) {
              setOneNovaTransferDestinationNetworkId(
                networks.destinationChain.id
              )
              openOneNovaTransferDialog()
              return
            }

            setNetworks({ sourceChainId: network.id })
          }
        },
        to: {
          disabled: !toOptions.length,
          options: toOptions,
          value: networks.destinationChain,
          onChange: async network => {
            if (network.id === networks.sourceChain.id) {
              switchNetworksOnTransferPanel()
              return
            }

            if (
              shouldOpenOneNovaDialog([network.id, networks.sourceChain.id])
            ) {
              setOneNovaTransferDestinationNetworkId(network.id)
              openOneNovaTransferDialog()
              return
            }

            setNetworks({ destinationChainId: network.id })
          }
        }
      }
    }

    return {
      from: {
        disabled:
          !fromOptions.length ||
          isSmartContractWallet ||
          typeof isSmartContractWallet === 'undefined',
        options: fromOptions,
        value: networks.sourceChain,
        onChange: async network => {
          if (
            shouldOpenOneNovaDialog([network.id, networks.destinationChain.id])
          ) {
            setOneNovaTransferDestinationNetworkId(networks.destinationChain.id)
            openOneNovaTransferDialog()
            return
          }

          setNetworks({ sourceChainId: network.id })
        }
      },
      to: {
        disabled: !toOptions.length,
        options: toOptions,
        value: networks.destinationChain,
        onChange: async network => {
          if (network.id === networks.sourceChain.id) {
            switchNetworksOnTransferPanel()
            return
          }

          if (shouldOpenOneNovaDialog([network.id, networks.sourceChain.id])) {
            setOneNovaTransferDestinationNetworkId(network.id)
            openOneNovaTransferDialog()
            return
          }

          setNetworks({ destinationChainId: network.id })
        }
      }
    }
  }, [
    networks.sourceChain,
    networks.destinationChain,
    isTestnetMode,
    isDepositMode,
    isSmartContractWallet,
    parentChain,
    setNetworks,
    openOneNovaTransferDialog,
    switchNetworksOnTransferPanel
  ])

  return (
    <div className="flex flex-col pb-6">
      <NetworkContainer network={networks.sourceChain}>
        <NetworkListboxPlusBalancesContainer>
          <NetworkListbox label="From:" {...networkListboxProps.from} />
          <BalancesContainer>
            <TokenBalance
              on={isDepositMode ? NetworkType.l1 : NetworkType.l2}
              balance={
                isDepositMode
                  ? selectedTokenBalances.l1
                  : selectedTokenBalances.l2
              }
              forToken={selectedToken}
              prefix={selectedToken ? 'Balance: ' : ''}
            />
            {nativeCurrency.isCustom ? (
              <>
                <TokenBalance
                  on={isDepositMode ? NetworkType.l1 : NetworkType.l2}
                  balance={
                    isDepositMode
                      ? customFeeTokenBalances.l1
                      : customFeeTokenBalances.l2
                  }
                  forToken={nativeCurrency}
                  prefix={selectedToken ? '' : 'Balance: '}
                />
                {/* Only show ETH balance on L1 */}
                {isDepositMode && <ETHBalance balance={ethL1Balance} />}
              </>
            ) : (
              <ETHBalance
                balance={isDepositMode ? ethL1Balance : ethL2Balance}
                prefix={selectedToken ? '' : 'Balance: '}
              />
            )}
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>

        <div className="flex flex-col space-y-1">
          <TransferPanelMainInput
            maxButtonProps={{
              visible: maxButtonVisible,
              loading: isMaxAmount || loadingMaxAmount,
              onClick: setMaxAmount
            }}
            errorMessage={errorMessageElement}
            value={isMaxAmount ? '' : amount}
            onChange={e => {
              setAmount(e.target.value)
            }}
          />

          {showUSDCSpecificInfo && (
            <p className="mt-1 text-xs font-light text-white">
              Bridged USDC (USDC.e) will work but is different from Native USDC.{' '}
              <ExternalLink
                href={USDC_LEARN_MORE_LINK}
                className="arb-hover underline"
              >
                Learn more
              </ExternalLink>
              .
            </p>
          )}

          {isDepositMode && selectedToken && (
            <p className="mt-1 text-xs font-light text-white">
              Make sure you have {nativeCurrency.symbol} in your{' '}
              {getNetworkName(childChain.id)} account, as you’ll need it to
              power transactions.
              <br />
              <ExternalLink
                href={ETH_BALANCE_ARTICLE_LINK}
                className="arb-hover underline"
              >
                Learn more
              </ExternalLink>
              .
            </p>
          )}
        </div>
        <EstimatedGas chainType="source" />
      </NetworkContainer>

      <div className="z-10 flex h-10 w-full items-center justify-center lg:h-12">
        <SwitchNetworksButton
          onClick={switchNetworksOnTransferPanel}
          aria-label="Switch Networks" // useful for accessibility, and catching the element in automation
        />
      </div>

      <NetworkContainer
        network={networks.destinationChain}
        customAddress={destinationAddress}
      >
        <NetworkListboxPlusBalancesContainer>
          <NetworkListbox label="To:" {...networkListboxProps.to} />
          <BalancesContainer>
            {destinationAddressOrWalletAddress &&
              utils.isAddress(destinationAddressOrWalletAddress) && (
                <>
                  <TokenBalance
                    balance={
                      isDepositMode
                        ? selectedTokenBalances.l2
                        : selectedTokenBalances.l1
                    }
                    on={isDepositMode ? NetworkType.l2 : NetworkType.l1}
                    forToken={selectedToken}
                    prefix={selectedToken ? 'Balance: ' : ''}
                  />
                  {/* In deposit mode, when user selected USDC on mainnet,
                  the UI shows the Arb One balance of both USDC.e and native USDC */}
                  {isDepositMode && showUSDCSpecificInfo && (
                    <TokenBalance
                      balance={
                        (isArbitrumOne
                          ? erc20L2Balances?.[CommonAddress.ArbitrumOne.USDC]
                          : erc20L2Balances?.[
                              CommonAddress.ArbitrumSepolia.USDC
                            ]) ?? constants.Zero
                      }
                      on={NetworkType.l2}
                      forToken={
                        selectedToken
                          ? { ...selectedToken, symbol: 'USDC' }
                          : null
                      }
                      tokenSymbolOverride="USDC"
                    />
                  )}
                  {nativeCurrency.isCustom ? (
                    <>
                      <TokenBalance
                        on={isDepositMode ? NetworkType.l2 : NetworkType.l1}
                        balance={
                          isDepositMode
                            ? customFeeTokenBalances.l2
                            : customFeeTokenBalances.l1
                        }
                        forToken={nativeCurrency}
                        prefix={selectedToken ? '' : 'Balance: '}
                      />
                      {!isDepositMode && <ETHBalance balance={ethL1Balance} />}
                    </>
                  ) : (
                    <ETHBalance
                      balance={isDepositMode ? ethL2Balance : ethL1Balance}
                      prefix={selectedToken ? '' : 'Balance: '}
                    />
                  )}
                </>
              )}
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>
        <EstimatedGas chainType="destination" />
      </NetworkContainer>

      <TransferDisabledDialog />
      <OneNovaTransferDialog
        {...oneNovaTransferDialogProps}
        onClose={() => setOneNovaTransferDestinationNetworkId(null)}
        destinationChainId={oneNovaTransferDestinationNetworkId}
        amount={amount}
      />
    </div>
  )
}
