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
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { useAccountType } from '../../hooks/useAccountType'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { withdrawEthEstimateGas } from '../../util/EthWithdrawalUtils'
import { GasEstimates } from '../../hooks/arbTokenBridge.types'
import { CommonAddress } from '../../util/CommonAddressUtils'
import {
  isTokenGoerliUSDC,
  isTokenMainnetUSDC,
  sanitizeTokenSymbol
} from '../../util/TokenUtils'
import { USDC_LEARN_MORE_LINK } from '../../constants'
import { NetworkListbox, NetworkListboxProps } from './NetworkListbox'
import { shortenAddress } from '../../util/CommonUtils'
import { OneNovaTransferDialog } from './OneNovaTransferDialog'

enum NetworkType {
  l1 = 'l1',
  l2 = 'l2'
}

export function SwitchNetworksButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { isEOA, isSmartContractWallet } = useAccountType()

  return (
    <button
      type="button"
      disabled={
        isSmartContractWallet || typeof isSmartContractWallet === 'undefined'
      }
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
    const { isArbitrum, isArbitrumNova } = isNetwork(network.id)

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
      <span>{formatAmount(balance, { symbol: 'ETH' })}</span>
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
  forToken: ERC20BridgeToken | null
  balance: BigNumber | null
  on: NetworkType
  prefix?: string
  tokenSymbolOverride?: string
}) {
  const { l1, l2 } = useNetworksAndSigners()

  const symbol = useMemo(() => {
    if (!forToken) {
      return undefined
    }

    return (
      tokenSymbolOverride ??
      sanitizeTokenSymbol(forToken.symbol, {
        erc20L1Address: forToken.address,
        chain: on === NetworkType.l1 ? l1.network : l2.network
      })
    )
  }, [forToken, on, l1, l2])

  if (!forToken) {
    return null
  }

  if (!balance) {
    return <StyledLoader />
  }

  return (
    <p>
      <span className="font-light">{prefix}</span>
      <span>
        {formatAmount(balance, {
          decimals: forToken.decimals,
          symbol
        })}
      </span>
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
    <div className="flex flex-row flex-nowrap items-center justify-between gap-1 whitespace-nowrap">
      {children}
    </div>
  )
}

export enum TransferPanelMainErrorMessage {
  INSUFFICIENT_FUNDS,
  GAS_ESTIMATION_FAILURE,
  WITHDRAW_ONLY,
  SC_WALLET_ETH_NOT_SUPPORTED
}

export function TransferPanelMain({
  amount,
  setAmount,
  errorMessage
}: {
  amount: string
  setAmount: (value: string) => void
  errorMessage?: TransferPanelMainErrorMessage
}) {
  const actions = useActions()

  const { l1, l2 } = useNetworksAndSigners()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const { isArbitrumOne, isArbitrumGoerli } = isNetwork(l2.network.id)
  const { isSmartContractWallet = false } = useAccountType()
  const { switchNetworkAsync } = useSwitchNetworkWithConfig({
    isSwitchingNetworkBeforeTx: true
  })

  const l1GasPrice = useGasPrice({ provider: l1.provider })
  const l2GasPrice = useGasPrice({ provider: l2.provider })

  const { app } = useAppState()
  const { isDepositMode, selectedToken } = app
  const { address: walletAddress } = useAccount()

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

  useEffect(() => {
    if (
      selectedToken &&
      destinationAddressOrWalletAddress &&
      utils.isAddress(destinationAddressOrWalletAddress)
    ) {
      updateErc20L1Balances([selectedToken.address])
      if (selectedToken.l2Address) {
        updateErc20L2Balances([selectedToken.l2Address])
      }
      if (isTokenMainnetUSDC(selectedToken.address)) {
        updateErc20L2Balances([CommonAddress.ArbitrumOne.USDC])
      }
      if (isTokenGoerliUSDC(selectedToken.address)) {
        updateErc20L2Balances([CommonAddress.ArbitrumGoerli.USDC])
      }
    }
  }, [
    selectedToken,
    updateErc20L1Balances,
    updateErc20L2Balances,
    destinationAddressOrWalletAddress
  ])

  const isSwitchingL2Chain = useIsSwitchingL2Chain()

  const selectedTokenBalances = useMemo(() => {
    const result: {
      l1: BigNumber | null
      l2: BigNumber | null
    } = {
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

    return result
  }, [erc20L1Balances, erc20L2Balances, selectedToken])

  const externalFrom = isConnectedToArbitrum ? l2.network : l1.network
  const externalTo = isConnectedToArbitrum ? l1.network : l2.network

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
    const l2ChainId = isConnectedToArbitrum ? externalFrom.id : externalTo.id

    setFrom(externalFrom)
    setTo(externalTo)

    // Keep the connected L2 chain id in search params, so it takes preference in any L1 => L2 actions
    setQueryParams({ l2ChainId })
  }, [
    isConnectedToArbitrum,
    externalFrom,
    externalTo,
    setQueryParams,
    l1.provider,
    l2.provider
  ])

  const estimateGas = useCallback(
    async (
      weiValue: BigNumber
    ): Promise<
      | (GasEstimates & {
          estimatedL2SubmissionCost: BigNumber
        })
      | null
    > => {
      if (!walletAddress) {
        return null
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
    [isDepositMode, walletAddress, l1.provider, l2.provider]
  )

  const setMaxAmount = useCallback(async () => {
    const ethBalance = isDepositMode ? ethL1Balance : ethL2Balance

    const tokenBalance = isDepositMode
      ? selectedTokenBalances.l1
      : selectedTokenBalances.l2

    if (selectedToken) {
      if (!tokenBalance) {
        return
      }

      // For tokens, we can set the max amount, and have the gas summary component handle the rest
      setAmount(utils.formatUnits(tokenBalance, selectedToken?.decimals))
      return
    }

    if (!ethBalance) {
      return
    }

    try {
      setLoadingMaxAmount(true)
      const result = await estimateGas(ethBalance)

      if (!result) {
        return
      }

      const estimatedL1GasFees = calculateEstimatedL1GasFees(
        result.estimatedL1Gas,
        l1GasPrice
      )
      const estimatedL2GasFees = calculateEstimatedL2GasFees(
        result.estimatedL2Gas,
        l2GasPrice,
        result.estimatedL2SubmissionCost
      )

      const ethBalanceFloat = parseFloat(utils.formatEther(ethBalance))
      const estimatedTotalGasFees = estimatedL1GasFees + estimatedL2GasFees
      setAmount(String(ethBalanceFloat - estimatedTotalGasFees * 1.4))
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingMaxAmount(false)
    }
  }, [
    estimateGas,
    ethL1Balance,
    ethL2Balance,
    isDepositMode,
    l1GasPrice,
    l2GasPrice,
    selectedToken,
    setAmount,
    selectedTokenBalances
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
  }, [selectedToken])

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

  const errorMessageText = useMemo(() => {
    if (typeof errorMessage === 'undefined') {
      return undefined
    }

    if (errorMessage === TransferPanelMainErrorMessage.GAS_ESTIMATION_FAILURE) {
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
    }

    if (errorMessage === TransferPanelMainErrorMessage.WITHDRAW_ONLY) {
      return (
        <>
          <span>This token can&apos;t be bridged over. </span>
          <button
            className="arb-hover underline"
            onClick={openWithdrawOnlyDialog}
          >
            Learn more.
          </button>
        </>
      )
    }

    if (
      errorMessage === TransferPanelMainErrorMessage.SC_WALLET_ETH_NOT_SUPPORTED
    ) {
      return "ETH transfers using smart contract wallets aren't supported yet."
    }

    return `Insufficient balance, please add more to ${
      isDepositMode ? 'L1' : 'L2'
    }.`
  }, [errorMessage, isDepositMode, openWithdrawOnlyDialog])

  const switchNetworksOnTransferPanel = useCallback(() => {
    const newFrom = to
    const newTo = from

    setFrom(newFrom)
    setTo(newTo)

    actions.app.setIsDepositMode(!app.isDepositMode)
  }, [actions.app, app.isDepositMode, from, to])

  type NetworkListboxesProps = {
    from: Omit<NetworkListboxProps, 'label'>
    to: Omit<NetworkListboxProps, 'label'>
  }

  const networkListboxProps: NetworkListboxesProps = useMemo(() => {
    const options = getListboxOptionsFromL1Network(l1.network)

    function updatePreferredL2Chain(l2ChainId: number) {
      setQueryParams({ l2ChainId })
    }

    function modifyOptions(selectedChainId: ChainId, direction: 'from' | 'to') {
      // Add L1 network to the list
      return [l1.network, ...options].filter(option => {
        // Remove the origin network from the destination list for contract wallets
        // It's done so that the origin network is not changed
        if (
          isSmartContractWallet &&
          direction === 'to' &&
          option.id === from.id
        ) {
          return false
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
            if (shouldOpenOneNovaDialog([network.id, to.id])) {
              setOneNovaTransferDestinationNetworkId(to.id)
              openOneNovaTransferDialog()
              return
            }

            const { isEthereum } = isNetwork(network.id)

            // Selecting the same chain or L1 network
            if (from.id === network.id || isEthereum) {
              return
            }

            try {
              await switchNetworkAsync?.(network.id)
              updatePreferredL2Chain(network.id)

              // If L2 selected, change to withdraw mode and set new selections
              switchNetworksOnTransferPanel()
              setFrom(network)
              setTo(l1.network)
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
            // Selecting the same chain
            if (to.id === network.id) {
              return
            }

            if (shouldOpenOneNovaDialog([network.id, from.id])) {
              setOneNovaTransferDestinationNetworkId(network.id)
              openOneNovaTransferDialog()
              return
            }

            const { isEthereum } = isNetwork(network.id)

            // Switch networks if selecting L1 network
            if (isEthereum) {
              return switchNetworksOnTransferPanel()
            }

            if (isConnectedToArbitrum) {
              // In deposit mode, if we are connected to a different L2 network
              //
              // 1) Switch to the L1 network (to be able to initiate a deposit)
              // 2) Select the preferred L2 network
              try {
                await switchNetworkAsync?.(l1.network.id)
                updatePreferredL2Chain(network.id)
              } catch (error: any) {
                if (!isUserRejectedError(error)) {
                  Sentry.captureException(error)
                }
              }
            } else {
              // If we are connected to an L1 network, we can just select the preferred L2 network
              updatePreferredL2Chain(network.id)
            }
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
          // Selecting the same chain
          if (from.id === network.id) {
            return
          }

          if (shouldOpenOneNovaDialog([network.id, to.id])) {
            setOneNovaTransferDestinationNetworkId(to.id)
            openOneNovaTransferDialog()
            return
          }

          const { isEthereum } = isNetwork(network.id)

          // Switch networks if selecting L1 network
          if (isEthereum) {
            return switchNetworksOnTransferPanel()
          }

          // In withdraw mode we always switch to the L2 network
          try {
            await switchNetworkAsync?.(network.id)
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
          const { isEthereum } = isNetwork(network.id)

          // Selecting the same chain or L1 network
          if (to.id === network.id || isEthereum) {
            return
          }

          if (shouldOpenOneNovaDialog([network.id, from.id])) {
            setOneNovaTransferDestinationNetworkId(network.id)
            openOneNovaTransferDialog()
            return
          }

          // Destination network is L2, connect to L1
          try {
            await switchNetworkAsync?.(l1.network.id)
            updatePreferredL2Chain(network.id)

            // Change to withdraw mode and set new selections
            switchNetworksOnTransferPanel()
            setFrom(l1.network)
            setTo(network)
          } catch (error: any) {
            if (!isUserRejectedError(error)) {
              Sentry.captureException(error)
            }
          }
        }
      }
    }
  }, [
    l1.network,
    from,
    to,
    isSmartContractWallet,
    isDepositMode,
    setQueryParams,
    switchNetworkAsync,
    switchNetworksOnTransferPanel,
    isConnectedToArbitrum
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
                <ETHBalance
                  balance={app.isDepositMode ? ethL1Balance : ethL2Balance}
                  prefix={selectedToken ? '' : 'BALANCE: '}
                />
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
            errorMessage={errorMessageText}
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
              Make sure you have ETH in your L2 wallet, you’ll need it to power
              transactions.
              <br />
              <ExternalLink
                href="https://consensys.zendesk.com/hc/en-us/articles/7536324817435"
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
                  <ETHBalance
                    balance={app.isDepositMode ? ethL2Balance : ethL1Balance}
                    prefix={selectedToken ? '' : 'BALANCE: '}
                  />
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
