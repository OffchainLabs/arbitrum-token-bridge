import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Listbox } from '@headlessui/react'
import { ChevronDownIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import { Loader } from '../common/atoms/Loader'
import { twMerge } from 'tailwind-merge'
import { BigNumber, constants, utils } from 'ethers'

import * as Sentry from '@sentry/react'
import Image from 'next/image'
import { Chain } from 'wagmi'

import { useActions, useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { formatAmount } from '../../util/NumberUtils'
import {
  ChainId,
  getL2ChainIds,
  getNetworkLogo,
  getNetworkName,
  isNetwork
} from '../../util/networks'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { AdvancedSettings, AdvancedSettingsErrors } from './AdvancedSettings'
import { ExternalLink } from '../common/ExternalLink'
import { Dialog, useDialog } from '../common/Dialog'
import { Tooltip } from '../common/Tooltip'
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
import { NetworkType, useTokenBalances } from './useTokenBalances'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { useBalance } from '../../hooks/useBalance'
import { useGasPrice } from '../../hooks/useGasPrice'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useAccountType } from '../../hooks/useAccountType'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { withdrawEthEstimateGas } from '../../util/EthWithdrawalUtils'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'

export function SwitchNetworksButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      type="button"
      className="min-h-14 lg:min-h-16 min-w-14 lg:min-w-16 hover:animate-rotate-180 focus-visible:animate-rotate-180 flex h-14 w-14 items-center justify-center rounded-full bg-white p-3 shadow-[0_0_4px_0_rgba(0,0,0,0.25)] transition duration-200 hover:bg-gray-1 focus-visible:ring-2 focus-visible:ring-gray-4 active:bg-gray-2 lg:h-16 lg:w-16 lg:p-4"
      {...props}
    >
      <ArrowsUpDownIcon className="text-dark" />
    </button>
  )
}

type OptionsExtraProps = {
  disabled?: boolean
  disabledTooltip?: string
}

type NetworkListboxProps = {
  disabled?: boolean
  label: string
  options: (Chain & OptionsExtraProps)[]
  value: Chain
  onChange: (value: Chain) => void
}

function NetworkListbox({
  disabled = false,
  label,
  options,
  value,
  onChange
}: NetworkListboxProps) {
  const buttonClassName = useMemo(() => {
    const { isArbitrum, isArbitrumNova } = isNetwork(value.id)

    if (!isArbitrum) {
      return 'bg-eth-primary'
    }

    if (isArbitrumNova) {
      return 'bg-arb-nova-primary'
    }

    return 'bg-arb-one-primary'
  }, [value])

  const getOptionClassName = useCallback(
    (index: number) => {
      if (index === 0) {
        return 'rounded-tl-xl rounded-tr-xl'
      }

      if (index === options.length - 1) {
        return 'rounded-bl-xl rounded-br-xl'
      }

      return ''
    },
    [options.length]
  )

  return (
    <Listbox
      as="div"
      className="relative"
      disabled={disabled}
      value={value}
      onChange={onChange}
    >
      <Listbox.Button
        className={`arb-hover flex w-max items-center space-x-1 rounded-full px-3 py-2 text-sm text-white md:text-2xl lg:px-4 lg:py-3 ${buttonClassName}`}
      >
        <span>
          {label} {getNetworkName(value.id)}
        </span>
        {!disabled && <ChevronDownIcon className="h-4 w-4" />}
      </Listbox.Button>

      <Listbox.Options className="absolute z-20 ml-2 mt-2 overflow-hidden rounded-xl bg-white shadow-[0px_4px_12px_#9e9e9e]">
        {options.map((option, index) => {
          return (
            <Tooltip
              key={option.id}
              show={option.disabled}
              content={option.disabledTooltip}
              wrapperClassName="w-full"
              theme="dark"
            >
              <Listbox.Option
                value={option}
                className={twMerge(
                  'flex h-12 min-w-max cursor-pointer items-center space-x-2 px-4 py-7 hover:bg-[rgba(0,0,0,0.2)]',
                  getOptionClassName(index),
                  option.disabled ? 'pointer-events-none opacity-40' : ''
                )}
                disabled={option.disabled}
              >
                <div className="flex h-8 w-8 items-center justify-center">
                  <Image
                    src={getNetworkLogo(option.id)}
                    alt={`${getNetworkName(option.id)} logo`}
                    className="max-h-7 w-auto"
                    width={36}
                    height={36}
                  />
                </div>
                <span>{getNetworkName(option.id)}</span>
              </Listbox.Option>
            </Tooltip>
          )
        })}
      </Listbox.Options>
    </Listbox>
  )
}

function getListboxOptionsFromL1Network(network: Chain) {
  return getL2ChainIds(network.id).map(chainId => getWagmiChain(chainId))
}

function NetworkContainer({
  network,
  children
}: {
  network: Chain
  children: React.ReactNode
}) {
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

  return (
    <div
      className={`relative rounded-xl p-1 transition-colors ${backgroundClassName}`}
    >
      <div
        className="absolute left-0 top-0 z-0 h-full w-full bg-contain bg-left bg-no-repeat bg-origin-content p-2 opacity-50"
        style={{ backgroundImage }}
      ></div>
      <div className="relative space-y-3.5 bg-contain bg-no-repeat p-3 sm:flex-row lg:p-2">
        {children}
      </div>
    </div>
  )
}

function StyledLoader() {
  return <Loader color="white" size="small" />
}

function ETHBalance({ on, prefix = '' }: { on: NetworkType; prefix?: string }) {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const networksAndSigners = useNetworksAndSigners()
  const { l1, l2 } = networksAndSigners
  const walletAddress = arbTokenBridge.walletAddress

  const {
    eth: [ethL1Balance]
  } = useBalance({ provider: l1.provider, walletAddress })
  const {
    eth: [ethL2Balance]
  } = useBalance({ provider: l2.provider, walletAddress })

  const balance = on === NetworkType.l1 ? ethL1Balance : ethL2Balance

  if (!balance) {
    return <StyledLoader />
  }

  return (
    <span>
      {prefix}
      {formatAmount(balance, { symbol: 'ETH' })}
    </span>
  )
}

function TokenBalance({
  forToken,
  on,
  prefix = ''
}: {
  forToken: ERC20BridgeToken | null
  on: NetworkType
  prefix?: string
}) {
  const { l1, l2 } = useNetworksAndSigners()
  const balance = useTokenBalances(forToken?.address)[on]

  const symbol = useMemo(() => {
    if (!forToken) {
      return undefined
    }

    return sanitizeTokenSymbol(forToken.symbol, {
      erc20L1Address: forToken.address,
      chain: on === NetworkType.l1 ? l1.network : l2.network
    })
  }, [forToken, on, l1, l2])

  if (!forToken) {
    return null
  }

  if (!balance) {
    return <StyledLoader />
  }

  return (
    <span>
      {prefix}
      {formatAmount(balance, {
        decimals: forToken.decimals,
        symbol
      })}
    </span>
  )
}

function BalancesContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-1 flex flex-col flex-nowrap items-start break-all text-sm font-extralight tracking-[.25px] text-white md:items-end md:text-lg lg:font-medium lg:uppercase">
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
  errorMessage,
  destinationAddress,
  setDestinationAddress
}: {
  amount: string
  setAmount: (value: string) => void
  errorMessage?: TransferPanelMainErrorMessage
  destinationAddress?: string
  setDestinationAddress: React.Dispatch<
    React.SetStateAction<string | undefined>
  >
}) {
  const actions = useActions()

  const { l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()
  const { isSmartContractWallet = false } = useAccountType()

  const { switchNetworkAsync } = useSwitchNetworkWithConfig({
    isSwitchingNetworkBeforeTx: true
  })

  const l1GasPrice = useGasPrice({ provider: l1.provider })
  const l2GasPrice = useGasPrice({ provider: l2.provider })

  const { app } = useAppState()
  const { arbTokenBridge, isDepositMode, selectedToken } = app
  const { walletAddress } = arbTokenBridge

  const {
    eth: [ethL1Balance]
  } = useBalance({ provider: l1.provider, walletAddress })
  const {
    eth: [ethL2Balance]
  } = useBalance({ provider: l2.provider, walletAddress })

  const isSwitchingL2Chain = useIsSwitchingL2Chain()

  const tokenBalances = useTokenBalances(selectedToken?.address)

  const externalFrom = isConnectedToArbitrum ? l2.network : l1.network
  const externalTo = isConnectedToArbitrum ? l1.network : l2.network

  const [from, setFrom] = useState<Chain>(externalFrom)
  const [to, setTo] = useState<Chain>(externalTo)

  const [loadingMaxAmount, setLoadingMaxAmount] = useState(false)
  const [advancedSettingsError, setAdvancedSettingsError] =
    useState<AdvancedSettingsErrors | null>(null)
  const [withdrawOnlyDialogProps, openWithdrawOnlyDialog] = useDialog()
  const isMaxAmount = amount === AmountQueryParamEnum.MAX

  const showUSDCNotice =
    selectedToken?.address === CommonAddress.Mainnet.USDC &&
    isNetwork(l2.network.id).isArbitrumOne

  const [, setQueryParams] = useArbQueryParams()

  useEffect(() => {
    const l2ChainId = isConnectedToArbitrum ? externalFrom.id : externalTo.id

    setFrom(externalFrom)
    setTo(externalTo)

    // Keep the connected L2 chain id in search params, so it takes preference in any L1 => L2 actions
    setQueryParams({ l2ChainId })
  }, [isConnectedToArbitrum, externalFrom, externalTo, setQueryParams])

  const estimateGas = useCallback(
    async (
      weiValue: BigNumber
    ): Promise<{
      estimatedL1Gas: BigNumber
      estimatedL2Gas: BigNumber
      estimatedL2SubmissionCost: BigNumber
    }> => {
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

    const tokenBalance = isDepositMode ? tokenBalances.l1 : tokenBalances.l2

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
    tokenBalances.l1,
    tokenBalances.l2
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

  useEffect(() => {
    const getErrors = async () => {
      try {
        const isDestinationAddressSmartContract = await addressIsSmartContract(
          String(destinationAddress),
          isDepositMode ? l2.provider : l1.provider
        )
        if (
          // Destination address is not required for EOA wallets
          (!isSmartContractWallet && !destinationAddress) ||
          // Make sure address type matches the connected wallet type
          isSmartContractWallet === isDestinationAddressSmartContract
        ) {
          setAdvancedSettingsError(null)
        } else {
          setAdvancedSettingsError(AdvancedSettingsErrors.INVALID_ADDRESS)
        }
      } catch (err) {
        console.error(err)
        setAdvancedSettingsError(AdvancedSettingsErrors.INVALID_ADDRESS)
      }
    }
    getErrors()
  }, [
    l1.provider,
    l2.provider,
    isDepositMode,
    isSmartContractWallet,
    destinationAddress
  ])

  const maxButtonVisible = useMemo(() => {
    const ethBalance = isDepositMode ? ethL1Balance : ethL2Balance
    const tokenBalance = isDepositMode ? tokenBalances.l1 : tokenBalances.l2

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
  }, [ethL1Balance, ethL2Balance, tokenBalances, selectedToken, isDepositMode])

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
      return [l1.network, ...options]
        .filter(option => {
          // Remove selected network from the list
          return option.id !== selectedChainId
        })
        .map(option => {
          // Set disabled options (currently One<>Nova is disabled)
          return {
            ...option,
            disabled:
              direction === 'from'
                ? (to.id === ChainId.ArbitrumNova &&
                    option.id === ChainId.ArbitrumOne) ||
                  (to.id === ChainId.ArbitrumOne &&
                    option.id === ChainId.ArbitrumNova)
                : (from.id === ChainId.ArbitrumNova &&
                    option.id === ChainId.ArbitrumOne) ||
                  (from.id === ChainId.ArbitrumOne &&
                    option.id === ChainId.ArbitrumNova),
            // That's the only possible tooltip combination
            disabledTooltip: "One<>Nova transfers aren't enabled yet"
          }
        })
    }

    const fromOptions = modifyOptions(from.id, 'from')
    const toOptions = modifyOptions(to.id, 'to')

    if (isDepositMode) {
      return {
        from: {
          disabled: !fromOptions.length,
          options: fromOptions,
          value: from,
          onChange: async network => {
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
        disabled: !fromOptions.length,
        options: fromOptions,
        value: from,
        onChange: async network => {
          // Selecting the same chain
          if (from.id === network.id) {
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
                  forToken={selectedToken}
                  prefix={selectedToken ? 'Balance: ' : ''}
                />
                <ETHBalance
                  on={app.isDepositMode ? NetworkType.l1 : NetworkType.l2}
                  prefix={selectedToken ? '' : 'Balance: '}
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

          {isDepositMode && selectedToken && (
            <p className="mt-1 text-xs font-light text-white">
              Make sure you have ETH in your L2 wallet, you’ll need it to power
              transactions.
              <br />
              <ExternalLink
                href="https://consensys.zendesk.com/hc/en-us/articles/7536324817435"
                className="arb-hover underline"
              >
                Learn more.
              </ExternalLink>
            </p>
          )}

          {showUSDCNotice && (
            <p className="mt-1 text-xs font-light text-white">
              Native USDC is live on Arbitrum One!
              <br />
              <ExternalLink
                href="https://arbiscan.io/token/0xff970a61a04b1ca14834a43f5de4533ebddb5cc8"
                className="arb-hover underline"
              >
                Bridged USDC (USDC.e)
              </ExternalLink>{' '}
              will work but is different from{' '}
              <ExternalLink
                href="https://arbiscan.io/token/0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
                className="arb-hover underline"
              >
                Native USDC
              </ExternalLink>
              .{' '}
              <ExternalLink
                href="https://arbitrumfoundation.medium.com/usdc-to-come-natively-to-arbitrum-f751a30e3d83"
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

      <NetworkContainer network={to}>
        <NetworkListboxPlusBalancesContainer>
          <NetworkListbox label="To:" {...networkListboxProps.to} />
          <BalancesContainer>
            {isSwitchingL2Chain ? (
              <StyledLoader />
            ) : (
              <>
                <TokenBalance
                  on={app.isDepositMode ? NetworkType.l2 : NetworkType.l1}
                  forToken={selectedToken}
                  prefix={selectedToken ? 'Balance: ' : ''}
                />
                <ETHBalance
                  on={app.isDepositMode ? NetworkType.l2 : NetworkType.l1}
                  prefix={selectedToken ? '' : 'Balance: '}
                />
              </>
            )}
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>
      </NetworkContainer>

      <AdvancedSettings
        destinationAddress={destinationAddress}
        onChange={value => setDestinationAddress(value)}
        error={advancedSettingsError}
      />
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
    </div>
  )
}
