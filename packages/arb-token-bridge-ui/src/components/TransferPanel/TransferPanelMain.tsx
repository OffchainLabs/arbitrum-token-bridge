import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Listbox } from '@headlessui/react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  SwitchVerticalIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/outline'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/solid'
import { Loader } from '../common/atoms/Loader'
import { twMerge } from 'tailwind-merge'
import { BigNumber, constants, utils } from 'ethers'
import { L1Network, L2Network } from '@arbitrum/sdk'
import { l2Networks } from '@arbitrum/sdk/dist/lib/dataEntities/networks'
import { ERC20BridgeToken, useBalance, useGasPrice } from 'token-bridge-sdk'
import * as Sentry from '@sentry/react'
import Image from 'next/image'
import { useSwitchNetwork } from 'wagmi'

import { useActions, useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { formatAmount } from '../../util/NumberUtils'
import { TransferValidationErrors } from '../../util/AddressUtils'
import {
  ChainId,
  getNetworkLogo,
  getNetworkName,
  handleSwitchNetworkError,
  handleSwitchNetworkOnMutate,
  isNetwork
} from '../../util/networks'
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

export function SwitchNetworksButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      type="button"
      className="min-h-14 lg:min-h-16 min-w-14 lg:min-w-16 hover:animate-rotate-180 focus-visible:animate-rotate-180 flex h-14 w-14 items-center justify-center rounded-full bg-white p-3 shadow transition duration-200 hover:bg-gray-1 focus-visible:ring-2 focus-visible:ring-gray-6 active:bg-gray-2 lg:h-16 lg:w-16"
      {...props}
    >
      <SwitchVerticalIcon className="text-gray-9" />
    </button>
  )
}

enum AdvancedSettingsErrors {
  INVALID_ADDRESS = 'The destination address is not valid.',
  EMPTY_ADDRESS = 'The destination address is required for contract wallet transfers.'
}

type OptionsExtraProps = {
  disabled?: boolean
  disabledTooltip?: string
}

type NetworkListboxProps = {
  disabled?: boolean
  label: string
  options: ((L1Network | L2Network) & OptionsExtraProps)[]
  value: L1Network | L2Network
  onChange: (value: L1Network | L2Network) => void
}

function NetworkListbox({
  disabled = false,
  label,
  options,
  value,
  onChange
}: NetworkListboxProps) {
  const buttonClassName = useMemo(() => {
    const { isArbitrum, isArbitrumNova } = isNetwork(value.chainID)

    if (!isArbitrum) {
      return 'bg-[rgba(118,121,145,0.8)]'
    }

    if (isArbitrumNova) {
      return 'bg-[rgba(255,206,162,0.8)]'
    }

    return 'bg-[rgba(101,109,123,0.8)]'
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
        className={`arb-hover flex w-max items-center space-x-1 rounded-full px-4 py-3 text-2xl text-white ${buttonClassName}`}
      >
        <span>
          {label} {getNetworkName(value.chainID)}
        </span>
        {!disabled && <ChevronDownIcon className="h-4 w-4" />}
      </Listbox.Button>

      <Listbox.Options className="absolute z-20 mt-2 overflow-hidden rounded-xl bg-white shadow-[0px_4px_12px_#9e9e9e]">
        {options.map((option, index) => {
          return (
            <Tooltip
              key={option.chainID}
              show={option.disabled}
              content={option.disabledTooltip}
              wrapperClassName="w-full"
              theme="dark"
            >
              <Listbox.Option
                value={option}
                className={twMerge(
                  'flex h-12 min-w-max cursor-pointer items-center space-x-2 px-4 hover:bg-[rgba(0,0,0,0.2)]',
                  getOptionClassName(index),
                  option.disabled ? 'pointer-events-none opacity-40' : ''
                )}
                disabled={option.disabled}
              >
                <div className="flex h-8 w-8 items-center justify-center">
                  <Image
                    src={getNetworkLogo(option.chainID)}
                    alt={`${getNetworkName(option.chainID)} logo`}
                    className="max-h-9 w-auto"
                    width={36}
                    height={36}
                  />
                </div>
                <span>{getNetworkName(option.chainID)}</span>
              </Listbox.Option>
            </Tooltip>
          )
        })}
      </Listbox.Options>
    </Listbox>
  )
}

function getListboxOptionsFromL1Network(network: L1Network) {
  const options: L2Network[] = []

  network.partnerChainIDs.forEach(chainId => {
    const l2Network = l2Networks[chainId]
    if (l2Network && !options.includes(l2Network)) {
      options.push(l2Network)
    }
  })

  return options
}

function NetworkContainer({
  network,
  children
}: {
  network: L1Network | L2Network
  children: React.ReactNode
}) {
  const { backgroundImage, backgroundClassName } = useMemo(() => {
    const { isArbitrum, isArbitrumNova } = isNetwork(network.chainID)

    if (!isArbitrum) {
      return {
        backgroundImage: `url('/images/TransparentEthereumLogo.webp')`,
        backgroundClassName: 'bg-purple-ethereum'
      }
    }

    if (isArbitrumNova) {
      return {
        backgroundImage: `url('/images/ArbitrumNovaLogo.svg')`,
        backgroundClassName: 'bg-[#8a4100]'
      }
    }

    return {
      backgroundImage: `url('/images/ArbitrumOneLogo.svg')`,
      backgroundClassName: 'bg-blue-arb-one'
    }
  }, [network])

  return (
    <div className={`rounded-xl p-2 transition-colors ${backgroundClassName}`}>
      <div
        className="space-y-3.5 bg-contain bg-no-repeat p-1.5 sm:flex-row"
        style={{ backgroundImage }}
      >
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
    <span className="break-all text-xl font-light text-white">
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
  const balance = useTokenBalances(forToken?.address)[on]

  if (!forToken) {
    return null
  }

  if (!balance) {
    return <StyledLoader />
  }

  return (
    <span className="text-xl font-light text-white">
      {prefix}
      {formatAmount(balance, {
        decimals: forToken.decimals,
        symbol: forToken.symbol
      })}
    </span>
  )
}

function BalancesContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center sm:items-end">{children}</div>
  )
}

function NetworkListboxPlusBalancesContainer({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center space-y-3.5 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      {children}
    </div>
  )
}

export enum TransferPanelMainErrorMessage {
  INSUFFICIENT_FUNDS,
  GAS_ESTIMATION_FAILURE,
  WITHDRAW_ONLY
}

export function TransferPanelMain({
  amount,
  setAmount,
  errorMessage,
  destinationAddress,
  setDestinationAddress,
  transferValidationError
}: {
  amount: string
  setAmount: (value: string) => void
  errorMessage?: TransferPanelMainErrorMessage
  destinationAddress?: string
  setDestinationAddress: React.Dispatch<
    React.SetStateAction<string | undefined>
  >
  transferValidationError: TransferValidationErrors | null
}) {
  const actions = useActions()

  const { l1, l2, isConnectedToArbitrum, isSmartContractWallet } =
    useNetworksAndSigners()

  const { switchNetwork } = useSwitchNetwork({
    throwForSwitchChainNotSupported: true,
    onMutate: () =>
      handleSwitchNetworkOnMutate({ isSwitchingNetworkBeforeTx: true }),
    onError: handleSwitchNetworkError
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

  const [from, setFrom] = useState<L1Network | L2Network>(externalFrom)
  const [to, setTo] = useState<L1Network | L2Network>(externalTo)

  const [loadingMaxAmount, setLoadingMaxAmount] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [advancedSettingsError, setAdvancedSettingsError] =
    useState<AdvancedSettingsErrors | null>(null)
  const [verifyingDestinationAddress, setVerifyingDestinationAddress] =
    useState(false)
  const [destinationAddressInputDisabled, setDestinationAddressInputDisabled] =
    useState(!isSmartContractWallet)
  const [withdrawOnlyDialogProps, openWithdrawOnlyDialog] = useDialog()
  const isMaxAmount = amount === AmountQueryParamEnum.MAX

  const [, setQueryParams] = useArbQueryParams()

  const destAddressInputClassName =
    (advancedSettingsError
      ? 'border border-[#cd0000]'
      : 'border border-gray-9') +
    ` ${destinationAddressInputDisabled ? 'bg-slate-200' : 'bg-white'}`

  useEffect(() => {
    const l2ChainId = isConnectedToArbitrum
      ? externalFrom.chainID
      : externalTo.chainID

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
        const result = await arbTokenBridge.eth.depositEstimateGas({
          amount: weiValue
        })

        return result
      }

      const result = await arbTokenBridge.eth.withdrawEstimateGas({
        amount: weiValue
      })

      return { ...result, estimatedL2SubmissionCost: constants.Zero }
    },
    [arbTokenBridge.eth, isDepositMode]
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

  const DestinationAddressExplorer = useCallback(() => {
    const { explorerUrl } = (isDepositMode ? l2 : l1).network

    if (!explorerUrl || verifyingDestinationAddress || advancedSettingsError) {
      return null
    }
    return (
      <ExternalLink
        className="mt-2 flex w-fit text-xs text-slate-500"
        href={`${explorerUrl}/address/${destinationAddress || walletAddress}`}
      >
        <ExternalLinkIcon className="mr-1 h-4 w-4" />
        View account in explorer
      </ExternalLink>
    )
  }, [
    destinationAddress,
    advancedSettingsError,
    verifyingDestinationAddress,
    isDepositMode,
    walletAddress,
    l1,
    l2
  ])

  const DestinationAddressLabel = useCallback(() => {
    if (
      verifyingDestinationAddress ||
      advancedSettingsError ||
      isSmartContractWallet ||
      !walletAddress
    ) {
      return null
    }

    // destination address defaults to wallet address
    return !destinationAddress ||
      walletAddress.toLowerCase() === destinationAddress?.toLowerCase() ? (
      <div className="w-fit rounded bg-lime px-2 py-1 text-sm text-lime-dark">
        Sending to your address
      </div>
    ) : (
      <div className="w-fit rounded bg-orange px-2 py-1 text-sm text-orange-dark">
        Sending to a different address
      </div>
    )
  }, [
    destinationAddress,
    isSmartContractWallet,
    walletAddress,
    verifyingDestinationAddress,
    advancedSettingsError
  ])

  // whenever the user changes the `amount` input, it should update the amount in browser query params as well
  useEffect(() => {
    setQueryParams({ amount })

    if (isMaxAmount) {
      setMaxAmount()
    }
  }, [amount, isMaxAmount, setMaxAmount, setQueryParams])

  useEffect(
    // Show on page load if SC wallet since destination address mandatory
    // or if destination address is provided
    () =>
      setShowAdvancedSettings(
        isSmartContractWallet || !!destinationAddress || showAdvancedSettings
      ),
    [isSmartContractWallet, destinationAddress, showAdvancedSettings]
  )

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
          return option.chainID !== selectedChainId
        })
        .map(option => {
          // Set disabled options (currently One<>Nova is disabled)
          return {
            ...option,
            disabled:
              direction === 'from'
                ? (to.chainID === ChainId.ArbitrumNova &&
                    option.chainID === ChainId.ArbitrumOne) ||
                  (to.chainID === ChainId.ArbitrumOne &&
                    option.chainID === ChainId.ArbitrumNova)
                : (from.chainID === ChainId.ArbitrumNova &&
                    option.chainID === ChainId.ArbitrumOne) ||
                  (from.chainID === ChainId.ArbitrumOne &&
                    option.chainID === ChainId.ArbitrumNova),
            // That's the only possible tooltip combination
            disabledTooltip: "One<>Nova transfers aren't enabled yet"
          }
        })
    }

    const fromOptions = modifyOptions(from.chainID, 'from')
    const toOptions = modifyOptions(to.chainID, 'to')

    if (isDepositMode) {
      return {
        from: {
          disabled: !fromOptions.length,
          options: fromOptions,
          value: from,
          onChange: async network => {
            const { isEthereum } = isNetwork(network.chainID)

            // Selecting the same chain or L1 network
            if (from.chainID === network.chainID || isEthereum) {
              return
            }

            try {
              await switchNetwork?.(network.chainID)
              updatePreferredL2Chain(network.chainID)

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
            if (to.chainID === network.chainID) {
              return
            }

            const { isEthereum } = isNetwork(network.chainID)

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
                await switchNetwork?.(l1.network.chainID)
                updatePreferredL2Chain(network.chainID)
              } catch (error: any) {
                if (!isUserRejectedError(error)) {
                  Sentry.captureException(error)
                }
              }
            } else {
              // If we are connected to an L1 network, we can just select the preferred L2 network
              updatePreferredL2Chain(network.chainID)
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
          if (from.chainID === network.chainID) {
            return
          }

          const { isEthereum } = isNetwork(network.chainID)

          // Switch networks if selecting L1 network
          if (isEthereum) {
            return switchNetworksOnTransferPanel()
          }

          // In withdraw mode we always switch to the L2 network
          try {
            await switchNetwork?.(network.chainID)
            updatePreferredL2Chain(network.chainID)
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
          const { isEthereum } = isNetwork(network.chainID)

          // Selecting the same chain or L1 network
          if (to.chainID === network.chainID || isEthereum) {
            return
          }

          // Destination network is L2, connect to L1
          try {
            await switchNetwork?.(l1.network.chainID)
            updatePreferredL2Chain(network.chainID)

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
    switchNetwork,
    switchNetworksOnTransferPanel,
    isConnectedToArbitrum
  ])

  const handleAdvancedSettingsToggle = useCallback(() => {
    // keep visible if destination address provided to make clear where funds go to
    // or for SC wallets as destination address is mandatory
    // allow to close if EOA and destination address === wallet address
    if (
      (destinationAddress &&
        destinationAddress !== walletAddress.toLowerCase()) ||
      isSmartContractWallet
    ) {
      setShowAdvancedSettings(true)
      return
    }
    setShowAdvancedSettings(!showAdvancedSettings)
  }, [
    showAdvancedSettings,
    destinationAddress,
    setShowAdvancedSettings,
    walletAddress,
    isSmartContractWallet
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

      <div className="mt-6">
        {/* advanced settings */}
        <button
          onClick={handleAdvancedSettingsToggle}
          className="flex flex-row items-center"
        >
          <span className=" text-lg">Advanced Settings</span>
          {showAdvancedSettings ? (
            <ChevronUpIcon className="ml-1 h-4 w-4" />
          ) : (
            <ChevronDownIcon className="ml-1 h-4 w-4" />
          )}
        </button>
        {showAdvancedSettings && (
          <div className="mt-2">
            <div className="flex flex-wrap items-center justify-between">
              <span className="text-md flex items-center text-gray-10">
                Destination Address
                <Tooltip
                  wrapperClassName="ml-1"
                  theme="dark"
                  content={
                    <span>
                      This is where your funds will end up at.{' '}
                      {isSmartContractWallet
                        ? ''
                        : 'Defaults to your wallet address.'}
                    </span>
                  }
                >
                  <QuestionMarkCircleIcon className="h-4 w-4 text-slate-400" />
                </Tooltip>
              </span>
              <DestinationAddressLabel />
            </div>
            <div
              className={twMerge(
                'mt-1 flex h-full flex-row items-center rounded',
                destAddressInputClassName
              )}
            >
              <input
                type="string"
                className="w-full rounded px-2 py-1"
                // we want to keep the input empty for the same wallet address
                // placeholder only displays it to the user for assurance
                placeholder={!isSmartContractWallet ? walletAddress : undefined}
                defaultValue={destinationAddress}
                spellCheck={false}
                disabled={
                  destinationAddressInputDisabled && !isSmartContractWallet
                }
                onChange={e => {
                  // prevents verification from flashing
                  // setVerifyingDestinationAddress(true)
                  if (!e.target.value) {
                    setDestinationAddress(undefined)
                  } else {
                    setDestinationAddress(e.target.value.toLowerCase())
                  }
                }}
                // disables 1password on the field
                data-1p-ignore
              />
              {!isSmartContractWallet && (
                <button
                  onClick={() =>
                    setDestinationAddressInputDisabled(
                      !destinationAddressInputDisabled
                    )
                  }
                >
                  {destinationAddressInputDisabled ? (
                    <LockClosedIcon className="mr-2 h-5 w-5 text-slate-600" />
                  ) : (
                    <LockOpenIcon className="mr-2 h-5 w-5 text-slate-600" />
                  )}
                </button>
              )}
            </div>
            <DestinationAddressExplorer />
            {verifyingDestinationAddress && (
              <div className="mt-2 flex">
                <Loader size="small" color="#94A2B8" />
                <span className="ml-2 text-xs text-slate-500">
                  Verifying address
                </span>
              </div>
            )}
          </div>
        )}
        {!verifyingDestinationAddress && transferValidationError && (
          <span className="text-xs text-red-400">
            {transferValidationError}
          </span>
        )}
      </div>

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
