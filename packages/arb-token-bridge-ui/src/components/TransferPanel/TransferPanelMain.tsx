import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import { Loader } from '../common/atoms/Loader'
import { twMerge } from 'tailwind-merge'
import { BigNumber, constants, utils } from 'ethers'
import * as Sentry from '@sentry/react'
import { Chain, useAccount } from 'wagmi'

import { useActions, useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { formatAmount } from '../../util/NumberUtils'
import {
  ChainId,
  getCustomChainFromLocalStorageById,
  getExplorerUrl,
  getL2ChainIds,
  isNetwork
} from '../../util/networks'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import {
  AdvancedSettings,
  useDestinationAddressStore
} from './AdvancedSettings'
import { ExternalLink } from '../common/ExternalLink'
import { Dialog, useDialog } from '../common/Dialog'
import {
  AmountQueryParamEnum,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'

import { TransferPanelMainInput } from './TransferPanelMainInput'
import {
  calculateEstimatedL1GasFees,
  calculateEstimatedL2GasFees,
  useIsSwitchingL2Chain
} from './TransferPanelMainUtils'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { useBalance } from '../../hooks/useBalance'
import { useGasPrice } from '../../hooks/useGasPrice'
import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { useIsConnectedToOrbitChain } from '../../hooks/useIsConnectedToOrbitChain'
import { useAccountType } from '../../hooks/useAccountType'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { withdrawEthEstimateGas } from '../../util/EthWithdrawalUtils'
import { GasEstimates } from '../../hooks/arbTokenBridge.types'
import { CommonAddress } from '../../util/CommonAddressUtils'
import {
  isTokenArbitrumGoerliNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  isTokenGoerliUSDC,
  isTokenMainnetUSDC,
  isTokenUSDC,
  sanitizeTokenSymbol
} from '../../util/TokenUtils'
import {
  ETH_BALANCE_ARTICLE_LINK,
  USDC_LEARN_MORE_LINK,
  ether
} from '../../constants'
import { NetworkListbox, NetworkListboxProps } from './NetworkListbox'
import {
  createBlockExplorerUrlForToken,
  shortenAddress
} from '../../util/CommonUtils'
import { OneNovaTransferDialog } from './OneNovaTransferDialog'
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'
import { useChainLayers } from '../../hooks/useChainLayers'
import {
  useNativeCurrency,
  NativeCurrencyErc20
} from '../../hooks/useNativeCurrency'
import { defaultErc20Decimals } from '../../defaults'
import { TransferReadinessRichErrorMessage } from './useTransferReadinessUtils'

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

function getListboxOptionsFromL1Network(network: Chain) {
  return getL2ChainIds(network.id).map(chainId => getWagmiChain(chainId))
}

function CustomAddressBanner({
  network,
  customAddress
}: {
  network: Chain
  customAddress: string | undefined
}) {
  const { isArbitrum, isArbitrumNova } = isNetwork(network.id)

  const bannerClassName = useMemo(() => {
    if (!isArbitrum) {
      return 'bg-cyan border-eth-dark'
    }
    if (isArbitrumNova) {
      return 'bg-orange border-arb-nova-dark'
    }
    return 'bg-cyan border-arb-one-dark'
  }, [isArbitrum, isArbitrumNova])

  if (!customAddress) {
    return null
  }

  return (
    <div
      className={twMerge(
        'w-full rounded-t-lg border-4 p-1 text-center text-sm',
        bannerClassName
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
  const { backgroundImage, backgroundClassName } = useMemo(() => {
    const {
      isArbitrum,
      isArbitrumNova,
      isOrbitChain,
      isXaiTestnet,
      isStylusTestnet
    } = isNetwork(network.id)

    if (isXaiTestnet) {
      return {
        backgroundImage: `url('/images/XaiLogo.svg')`,
        backgroundClassName: 'bg-xai-dark'
      }
    }

    if (isStylusTestnet) {
      return {
        backgroundImage: `url('/images/StylusLogo.svg')`,
        backgroundClassName: 'bg-stylus-dark'
      }
    }

    if (isOrbitChain) {
      return {
        backgroundImage: `url('/images/OrbitLogoWhite.svg')`,
        backgroundClassName: 'bg-orbit-dark'
      }
    }

    if (!isArbitrum) {
      return {
        backgroundImage: `url('/images/TransparentEthereumLogo.webp')`,
        backgroundClassName: 'bg-eth-dark'
      }
    }

    if (isArbitrumNova) {
      return {
        backgroundImage: `url('/images/ArbitrumNovaLogo.svg')`,
        backgroundClassName: 'bg-arb-nova-dark'
      }
    }

    return {
      backgroundImage: `url('/images/ArbitrumOneLogo.svg')`,
      backgroundClassName: 'bg-arb-one-dark'
    }
  }, [network])

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
        className={twMerge(
          `relative rounded-xl p-1 transition-colors ${backgroundClassName}`,
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
  const { l1, l2 } = useNetworksAndSigners()
  const isParentChain = on === NetworkType.l1
  const chain = isParentChain ? l1.network : l2.network

  const isERC20BridgeToken = (
    token: ERC20BridgeToken | NativeCurrencyErc20 | null
  ): token is ERC20BridgeToken =>
    token !== null && !token.hasOwnProperty('isCustom')

  const symbol = useMemo(() => {
    if (!forToken) {
      return undefined
    }

    return (
      tokenSymbolOverride ??
      sanitizeTokenSymbol(forToken.symbol, {
        erc20L1Address: forToken.address,
        chain
      })
    )
  }, [forToken, tokenSymbolOverride, chain])

  if (!forToken) {
    return null
  }

  if (!balance) {
    return <StyledLoader />
  }

  return (
    <p aria-label={`${symbol} balance on ${on}`}>
      <span className="font-light">{prefix}</span>
      <span className="tabular-nums">
        {formatAmount(balance, {
          decimals: forToken.decimals
        })}
      </span>{' '}
      {/* we don't want to show explorer link for native currency (either ETH or custom token), or USDC because user can bridge USDC to USDC.e or native USDC, vice versa */}
      {isERC20BridgeToken(forToken) && !isTokenUSDC(forToken.address) ? (
        <ExternalLink
          className="arb-hover underline"
          href={createBlockExplorerUrlForToken({
            explorerLink: chain.blockExplorers
              ? chain.blockExplorers.default.url
              : undefined,
            tokenAddress: isParentChain ? forToken.address : forToken.l2Address
          })}
        >
          <span>{symbol}</span>
        </ExternalLink>
      ) : (
        <span>{symbol}</span>
      )}
    </p>
  )
}

function BalancesContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-1 flex flex-col flex-nowrap items-end break-all text-sm font-extralight tracking-[.25px] text-white md:text-lg lg:font-medium">
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

  const { l1, l2 } = useNetworksAndSigners()
  const { layer } = useChainLayers()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const isConnectedToOrbitChain = useIsConnectedToOrbitChain()
  const { isArbitrumOne, isArbitrumGoerli } = isNetwork(l2.network.id)
  const { isSmartContractWallet } = useAccountType()

  const nativeCurrency = useNativeCurrency({ provider: l2.provider })

  const { switchNetworkAsync } = useSwitchNetworkWithConfig({
    isSwitchingNetworkBeforeTx: true
  })

  const l1GasPrice = useGasPrice({ provider: l1.provider })
  const l2GasPrice = useGasPrice({ provider: l2.provider })

  const { app } = useAppState()
  const { address: walletAddress } = useAccount()
  const { arbTokenBridge, isDepositMode, selectedToken } = app
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
    provider: l1.provider,
    walletAddress: l1WalletAddress
  })
  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances, updateErc20L2Balances]
  } = useBalance({
    provider: l2.provider,
    walletAddress: l2WalletAddress
  })
  const { updateUSDCBalances } = useUpdateUSDCBalances({
    walletAddress: destinationAddressOrWalletAddress
  })

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
      isTokenGoerliUSDC(selectedToken.address) ||
      isTokenArbitrumOneNativeUSDC(selectedToken.address) ||
      isTokenArbitrumGoerliNativeUSDC(selectedToken.address)
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

  const isSwitchingL2Chain = useIsSwitchingL2Chain()

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
      isTokenArbitrumGoerliNativeUSDC(selectedToken.address) &&
      erc20L1Balances &&
      erc20L2Balances
    ) {
      return {
        l1: erc20L1Balances[CommonAddress.Goerli.USDC] ?? null,
        l2: erc20L2Balances[selectedToken.address] ?? null
      }
    }

    return result
  }, [erc20L1Balances, erc20L2Balances, selectedToken])

  const [externalFrom, externalTo] = useMemo(() => {
    const isParentChainArbitrum = isNetwork(l1.network.id).isArbitrum

    if (isParentChainArbitrum) {
      return isConnectedToArbitrum
        ? [l1.network, l2.network]
        : [l2.network, l1.network]
    }

    // Parent chain is Ethereum.
    return isConnectedToArbitrum
      ? [l2.network, l1.network]
      : [l1.network, l2.network]
  }, [l1, l2, isConnectedToArbitrum])

  const [from, setFrom] = useState<Chain>(externalFrom)
  const [to, setTo] = useState<Chain>(externalTo)

  const [loadingMaxAmount, setLoadingMaxAmount] = useState(false)
  const [withdrawOnlyDialogProps, openWithdrawOnlyDialog] = useDialog()
  const [oneNovaTransferDialogProps, openOneNovaTransferDialog] = useDialog()
  const [
    oneNovaTransferDestinationNetworkId,
    setOneNovaTransferDestinationNetworkId
  ] = useState<number | null>(null)
  const isMaxAmount = amount === AmountQueryParamEnum.MAX

  const showUSDCSpecificInfo =
    (isTokenMainnetUSDC(selectedToken?.address) && isArbitrumOne) ||
    (isTokenGoerliUSDC(selectedToken?.address) && isArbitrumGoerli)

  const [, setQueryParams] = useArbQueryParams()

  useEffect(() => {
    setFrom(externalFrom)
    setTo(externalTo)
  }, [externalFrom, externalTo])

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
          l1Provider: l1.provider,
          l2Provider: l2.provider
        })
        return result
      }

      const result = await withdrawEthEstimateGas({
        amount: weiValue,
        address: walletAddress,
        l2Provider: l2.provider
      })

      return { ...result, estimatedL2SubmissionCost: constants.Zero }
    },
    [walletAddress, isDepositMode, l2.provider, l1.provider]
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

      // for a withdrawal init tx, this is the batch posting fee needed for the tx
      const estimatedL1GasFees = calculateEstimatedL1GasFees(
        result.estimatedL1Gas,
        // node interface returns l1 gas based on l2 gas price for withdrawals
        // https://github.com/OffchainLabs/arbitrum-docs/blob/1bd3b9beb0858725d0faafa188cd13d32f642f9c/arbitrum-docs/devs-how-tos/how-to-estimate-gas.mdx#L125
        isDepositMode ? l1GasPrice : l2GasPrice
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
              onClick={openWithdrawOnlyDialog}
            >
              Learn more.
            </button>
          </>
        )
    }
  }, [errorMessage, openWithdrawOnlyDialog])

  const switchNetworksOnTransferPanel = useCallback(() => {
    const newFrom = to
    const newTo = from

    setFrom(newFrom)
    setTo(newTo)

    actions.app.setIsDepositMode(!app.isDepositMode)
  }, [actions.app, app.isDepositMode, from, to])

  useEffect(() => {
    const isArbOneUSDC = isTokenArbitrumOneNativeUSDC(selectedToken?.address)
    const isArbGoerliUSDC = isTokenArbitrumGoerliNativeUSDC(
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
    } else if (isArbGoerliUSDC) {
      token.updateTokenData(CommonAddress.Goerli.USDC)
      actions.app.setSelectedToken({
        ...commonUSDC,
        address: CommonAddress.Goerli.USDC,
        l2Address: CommonAddress.ArbitrumGoerli['USDC.e']
      })
    }
  }, [actions.app, isDepositMode, selectedToken, token])

  type NetworkListboxesProps = {
    from: Omit<NetworkListboxProps, 'label'>
    to: Omit<NetworkListboxProps, 'label'>
  }

  const networkListboxProps: NetworkListboxesProps = useMemo(() => {
    const options = getListboxOptionsFromL1Network(l1.network)

    // used for switching to a specific network if L1 <> Orbit chain is selected in the UI
    // we can have a more dynamic solution in the future with more Orbit chains
    function mapChainToDefaultPartnerChain(chainId: ChainId) {
      const customOrbitChain = getCustomChainFromLocalStorageById(chainId)

      if (customOrbitChain) {
        return customOrbitChain.partnerChainID
      }

      switch (chainId) {
        case ChainId.Sepolia:
        case ChainId.StylusTestnet:
          return ChainId.ArbitrumSepolia
        default:
          return ChainId.ArbitrumGoerli
      }
    }

    function updatePreferredL2Chain(l2ChainId: number) {
      setQueryParams({ l2ChainId })
    }

    function modifyOptions(selectedChainId: ChainId, direction: 'from' | 'to') {
      const isFromOrbitChain = isNetwork(from.id).isOrbitChain
      const isToOrbitChain = isNetwork(to.id).isOrbitChain
      const { isArbitrum: isSelectedArbitrumChain } = isNetwork(selectedChainId)

      // Add L1 network to the list
      return [l1.network, ...options].filter(option => {
        const isSourceChainList = direction === 'from'
        const isDestinationChainList = direction === 'to'
        const isSameAsSourceChain = option.id === from.id
        const isSameAsDestinationChain = option.id === to.id
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
        if (isFromOrbitChain && isDestinationChainList) {
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
        if (isToOrbitChain && isSourceChainList) {
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

    const fromOptions = modifyOptions(from.id, 'from')
    const toOptions = modifyOptions(to.id, 'to')

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
          value: from,
          onChange: async network => {
            const { isEthereumMainnetOrTestnet } = isNetwork(network.id)

            if (shouldOpenOneNovaDialog([network.id, to.id])) {
              setOneNovaTransferDestinationNetworkId(to.id)
              openOneNovaTransferDialog()
              return
            }

            try {
              await switchNetworkAsync?.(network.id)

              const isOrbitChainSelected = isNetwork(l2.network.id).isOrbitChain
              // Pair Ethereum with an Arbitrum chain if an Orbit chain is currently selected.
              // Otherwise we want to keep the current chain, in case it's Nova.
              if (isEthereumMainnetOrTestnet && isOrbitChainSelected) {
                updatePreferredL2Chain(
                  mapChainToDefaultPartnerChain(network.id)
                )
                return
              }
              updatePreferredL2Chain(network.id)
            } catch (error: any) {
              if (!isUserRejectedError(error)) {
                Sentry.captureException(error)
              }
            }
          }
        },
        to: {
          disabled: !toOptions.length,
          options: toOptions,
          value: to,
          onChange: async network => {
            const { isEthereumMainnetOrTestnet, isOrbitChain } = isNetwork(
              network.id
            )
            const defaultPartnerChain = mapChainToDefaultPartnerChain(
              network.id
            )

            if (network.id === from.id) {
              switchNetworksOnTransferPanel()
              return
            }

            if (shouldOpenOneNovaDialog([network.id, from.id])) {
              setOneNovaTransferDestinationNetworkId(network.id)
              openOneNovaTransferDialog()
              return
            }

            const isOrbitChainCurrentlySelected = isNetwork(
              l2.network.id
            ).isOrbitChain
            // Pair Ethereum with an Arbitrum chain if an Orbit chain is currently selected.
            // Otherwise we want to keep the current chain, in case it's Nova.
            if (isEthereumMainnetOrTestnet && isOrbitChainCurrentlySelected) {
              updatePreferredL2Chain(defaultPartnerChain)
              return
            }

            // If Orbit chain is selected, we want to change network to Arbitrum One or Arbitrum Goerli.
            if (isOrbitChain) {
              try {
                if (!isConnectedToArbitrum) {
                  await switchNetworkAsync?.(defaultPartnerChain)
                }
              } catch (error: any) {
                if (!isUserRejectedError(error)) {
                  Sentry.captureException(error)
                }
                return
              }
            }

            updatePreferredL2Chain(network.id)
            setTo(network)
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
        value: from,
        onChange: async network => {
          const { isEthereumMainnetOrTestnet } = isNetwork(network.id)

          if (shouldOpenOneNovaDialog([network.id, to.id])) {
            setOneNovaTransferDestinationNetworkId(to.id)
            openOneNovaTransferDialog()
            return
          }

          try {
            // In withdraw mode we always switch to the L2 network.
            await switchNetworkAsync?.(network.id)

            const isOrbitChainSelected = isNetwork(l2.network.id).isOrbitChain
            // Pair Ethereum with an Arbitrum chain if an Orbit chain is currently selected.
            // Otherwise we want to keep the current chain, in case it's Nova.
            if (isEthereumMainnetOrTestnet && isOrbitChainSelected) {
              updatePreferredL2Chain(mapChainToDefaultPartnerChain(network.id))
              return
            }
            updatePreferredL2Chain(network.id)
          } catch (error: any) {
            if (!isUserRejectedError(error)) {
              Sentry.captureException(error)
            }
          }
        }
      },
      to: {
        disabled: !toOptions.length,
        options: toOptions,
        value: to,
        onChange: async network => {
          const { isEthereumMainnetOrTestnet, isOrbitChain } = isNetwork(
            network.id
          )
          const defaultPartnerChain = mapChainToDefaultPartnerChain(network.id)

          if (network.id === from.id) {
            switchNetworksOnTransferPanel()
            return
          }

          if (shouldOpenOneNovaDialog([network.id, from.id])) {
            setOneNovaTransferDestinationNetworkId(network.id)
            openOneNovaTransferDialog()
            return
          }

          if (isEthereumMainnetOrTestnet) {
            if (isConnectedToOrbitChain) {
              try {
                // If connected to an Orbit chain, we need to change network to Arbitrum.
                // We can't withdraw from an Orbit chain to Ethereum.
                await switchNetworkAsync?.(defaultPartnerChain)
                updatePreferredL2Chain(defaultPartnerChain)
                return
              } catch (error: any) {
                if (!isUserRejectedError(error)) {
                  Sentry.captureException(error)
                }
                return
              }
            }
            // Connected to Arbitrum.
            updatePreferredL2Chain(defaultPartnerChain)
          }

          if (isOrbitChain) {
            const isConnectedToEthereum =
              !isConnectedToArbitrum && !isConnectedToOrbitChain

            if (isConnectedToEthereum) {
              // If connected to Ethereum, we need to change network to Arbitrum.
              // We can't deposit from Ethereum to an Orbit chain.
              await switchNetworkAsync?.(defaultPartnerChain)
            }

            const isOrbitChainCurrentlySelected = isNetwork(
              l2.network.id
            ).isOrbitChain
            if (isOrbitChainCurrentlySelected) {
              // long-term we will have to change to Orbit chain's parent network
              // right now only Arbitrum Goerli is support so it's fine
              await switchNetworkAsync?.(defaultPartnerChain)
            }

            updatePreferredL2Chain(network.id)
          }

          setTo(network)
        }
      }
    }
  }, [
    l1.network,
    l2.network,
    from,
    to,
    isSmartContractWallet,
    isDepositMode,
    setQueryParams,
    switchNetworkAsync,
    switchNetworksOnTransferPanel,
    openOneNovaTransferDialog,
    isConnectedToArbitrum,
    isConnectedToOrbitChain
  ])

  return (
    <div className="flex flex-col px-6 py-6 lg:min-w-[540px] lg:px-0 lg:pl-6">
      <NetworkContainer network={from}>
        <NetworkListboxPlusBalancesContainer>
          <NetworkListbox label="From:" {...networkListboxProps.from} />
          <BalancesContainer>
            {isSwitchingL2Chain ? (
              <StyledLoader />
            ) : (
              <>
                <TokenBalance
                  on={app.isDepositMode ? NetworkType.l1 : NetworkType.l2}
                  balance={
                    app.isDepositMode
                      ? selectedTokenBalances.l1
                      : selectedTokenBalances.l2
                  }
                  forToken={selectedToken}
                  prefix={selectedToken ? 'BALANCE: ' : ''}
                />
                {nativeCurrency.isCustom ? (
                  <>
                    <TokenBalance
                      on={app.isDepositMode ? NetworkType.l1 : NetworkType.l2}
                      balance={
                        app.isDepositMode
                          ? customFeeTokenBalances.l1
                          : customFeeTokenBalances.l2
                      }
                      forToken={nativeCurrency}
                      prefix={selectedToken ? '' : 'BALANCE: '}
                    />
                    {/* Only show ETH balance on L1 */}
                    {app.isDepositMode && <ETHBalance balance={ethL1Balance} />}
                  </>
                ) : (
                  <ETHBalance
                    balance={app.isDepositMode ? ethL1Balance : ethL2Balance}
                    prefix={selectedToken ? '' : 'BALANCE: '}
                  />
                )}
              </>
            )}
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>

        <div className="flex flex-col space-y-1 pb-2.5">
          <TransferPanelMainInput
            maxButtonProps={{
              visible: maxButtonVisible,
              loading: isMaxAmount || loadingMaxAmount,
              onClick: setMaxAmount
            }}
            errorMessage={errorMessageElement}
            disabled={isSwitchingL2Chain}
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
              Make sure you have ETH in your {layer} wallet, you’ll need it to
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
      </NetworkContainer>

      <div className="z-10 flex h-10 w-full items-center justify-center lg:h-12">
        <SwitchNetworksButton
          onClick={switchNetworksOnTransferPanel}
          aria-label="Switch Networks" // useful for accessibility, and catching the element in automation
        />
      </div>

      <NetworkContainer network={to} customAddress={destinationAddress}>
        <NetworkListboxPlusBalancesContainer>
          <NetworkListbox label="To:" {...networkListboxProps.to} />
          <BalancesContainer>
            {isSwitchingL2Chain ? (
              <StyledLoader />
            ) : (
              destinationAddressOrWalletAddress &&
              utils.isAddress(destinationAddressOrWalletAddress) && (
                <>
                  <TokenBalance
                    balance={
                      app.isDepositMode
                        ? selectedTokenBalances.l2
                        : selectedTokenBalances.l1
                    }
                    on={app.isDepositMode ? NetworkType.l2 : NetworkType.l1}
                    forToken={selectedToken}
                    prefix={selectedToken ? 'BALANCE: ' : ''}
                  />
                  {/* In deposit mode, when user selected USDC on mainnet,
                  the UI shows the Arb One balance of both USDC.e and native USDC */}
                  {app.isDepositMode && showUSDCSpecificInfo && (
                    <TokenBalance
                      balance={
                        (isArbitrumOne
                          ? erc20L2Balances?.[CommonAddress.ArbitrumOne.USDC]
                          : erc20L2Balances?.[
                              CommonAddress.ArbitrumGoerli.USDC
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
                        on={app.isDepositMode ? NetworkType.l2 : NetworkType.l1}
                        balance={
                          app.isDepositMode
                            ? customFeeTokenBalances.l2
                            : customFeeTokenBalances.l1
                        }
                        forToken={nativeCurrency}
                        prefix={selectedToken ? '' : 'BALANCE: '}
                      />
                      {!app.isDepositMode && (
                        <ETHBalance balance={ethL1Balance} />
                      )}
                    </>
                  ) : (
                    <ETHBalance
                      balance={app.isDepositMode ? ethL2Balance : ethL1Balance}
                      prefix={selectedToken ? '' : 'BALANCE: '}
                    />
                  )}
                </>
              )
            )}
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>
      </NetworkContainer>

      <AdvancedSettings />
      <Dialog
        closeable
        title="Token not supported"
        cancelButtonProps={{ className: 'hidden' }}
        actionButtonTitle="Close"
        {...withdrawOnlyDialogProps}
        className="md:max-w-[628px]"
      >
        <p>
          The Arbitrum bridge does not currently support {selectedToken?.symbol}
          , please ask the {selectedToken?.symbol} team for more info.
        </p>
      </Dialog>
      <OneNovaTransferDialog
        {...oneNovaTransferDialogProps}
        onClose={() => setOneNovaTransferDestinationNetworkId(null)}
        destinationChainId={oneNovaTransferDestinationNetworkId}
        amount={amount}
      />
    </div>
  )
}
