import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Listbox } from '@headlessui/react'
import { ChevronDownIcon, SwitchVerticalIcon } from '@heroicons/react/outline'
import Loader from 'react-loader-spinner'
import { twMerge } from 'tailwind-merge'
import { BigNumber, utils } from 'ethers'
import { L1Network, L2Network } from '@arbitrum/sdk'
import { l2Networks } from '@arbitrum/sdk/dist/lib/dataEntities/networks'
import { ERC20BridgeToken, useBalance, useGasPrice } from 'token-bridge-sdk'
import * as Sentry from '@sentry/react'

import { useActions, useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getNetworkName, isNetwork } from '../../util/networks'
import { formatBigNumber } from '../../util/NumberUtils'
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
  useIsSwitchingL2Chain,
  useTokenBalances
} from './TransferPanelMainUtils'

import EthereumLogo from '../../assets/EthereumLogo.png'
import ArbitrumOneLogo from '../../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../../assets/ArbitrumNovaLogo.png'

import TransparentEthereumLogo from '../../assets/TransparentEthereumLogo.png'
import TransparentArbitrumOneLogo from '../../assets/TransparentArbitrumOneLogo.png'
import TransparentArbitrumNovaLogo from '../../assets/TransparentArbitrumNovaLogo.png'

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

type NetworkListboxProps = {
  disabled?: boolean
  label: string
  options: (L1Network | L2Network)[]
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

  const getOptionImageSrc = useCallback((network: L1Network | L2Network) => {
    const { isArbitrum, isArbitrumNova } = isNetwork(network.chainID)

    if (!isArbitrum) {
      return EthereumLogo
    }

    if (isArbitrumNova) {
      return ArbitrumNovaLogo
    }

    return ArbitrumOneLogo
  }, [])

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
        disabled={disabled}
        className={`arb-hover flex w-max items-center space-x-1 rounded-full px-4 py-3 text-2xl text-white ${buttonClassName}`}
      >
        <span>
          {label} {getNetworkName(value.chainID)}
        </span>
        {!disabled && <ChevronDownIcon className="h-4 w-4" />}
      </Listbox.Button>

      <Listbox.Options className="absolute z-20 mt-2 rounded-xl bg-white shadow-[0px_4px_12px_#9e9e9e]">
        {options.map((option, index) => (
          <Listbox.Option
            key={option.chainID}
            value={option}
            className={twMerge(
              'flex h-12 cursor-pointer items-center space-x-2 px-4 hover:bg-blue-arbitrum hover:bg-[rgba(0,0,0,0.2)]',
              getOptionClassName(index)
            )}
          >
            <img
              src={getOptionImageSrc(option)}
              alt={`${getNetworkName(option.chainID)} logo`}
              className="w-8"
            />
            <span>{getNetworkName(option.chainID)}</span>
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Listbox>
  )
}

function getListboxOptionsFromL1Network(network: L1Network) {
  let options: L2Network[] = []

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
        backgroundImage: `url(${TransparentEthereumLogo})`,
        backgroundClassName: 'bg-purple-ethereum'
      }
    }

    if (isArbitrumNova) {
      return {
        backgroundImage: `url(${TransparentArbitrumNovaLogo})`,
        backgroundClassName: 'bg-[#8a4100]'
      }
    }

    return {
      backgroundImage: `url(${TransparentArbitrumOneLogo})`,
      backgroundClassName: 'bg-blue-arbitrum'
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
  return <Loader type="TailSpin" color="white" height={16} width={16} />
}

function ETHBalance({
  on,
  prefix = ''
}: {
  on: 'ethereum' | 'arbitrum'
  prefix?: string
}) {
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

  const balance = on === 'ethereum' ? ethL1Balance : ethL2Balance

  if (!balance) {
    return <StyledLoader />
  }

  return (
    <span className="text-xl font-light text-white">
      {prefix}
      {formatBigNumber(balance, 18, 5)} ETH
    </span>
  )
}

function TokenBalance({
  forToken,
  on,
  prefix = ''
}: {
  forToken: ERC20BridgeToken | null
  on: 'ethereum' | 'arbitrum'
  prefix?: string
}) {
  const balances = useTokenBalances(forToken?.address)
  const balance = balances[on]

  if (!forToken) {
    return null
  }

  if (!balance) {
    return <StyledLoader />
  }

  return (
    <span className="text-xl font-light text-white">
      {prefix}
      {formatBigNumber(balance, forToken.decimals, 5)} {forToken.symbol}
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
  errorMessage
}: {
  amount: string
  setAmount: (value: string) => void
  errorMessage?: TransferPanelMainErrorMessage
}) {
  const history = useHistory()
  const actions = useActions()

  const { l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()

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
  const [withdrawOnlyDialogProps, openWithdrawOnlyDialog] = useDialog()

  const [, setQueryParams] = useArbQueryParams()

  useEffect(() => {
    const l2ChainId = isConnectedToArbitrum
      ? externalFrom.chainID
      : externalTo.chainID

    setFrom(externalFrom)
    setTo(externalTo)

    // Keep the connected L2 chain id in search params, so it takes preference in any L1 => L2 actions
    setQueryParams({ l2ChainId })
  }, [isConnectedToArbitrum, externalFrom, externalTo, history])

  useEffect(() => {
    if (amount.toLowerCase() === AmountQueryParamEnum.MAX) {
      setMaxAmount()
    }
  }, [amount, setMaxAmount])

  const maxButtonVisible = useMemo(() => {
    const ethBalance = isDepositMode ? ethL1Balance : ethL2Balance
    const tokenBalance = isDepositMode
      ? tokenBalances.ethereum
      : tokenBalances.arbitrum

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
          <span>This token can't be bridged over. </span>
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

  function switchNetworks() {
    const newFrom = to
    const newTo = from

    setFrom(newFrom)
    setTo(newTo)

    actions.app.setIsDepositMode(!app.isDepositMode)
  }

  async function estimateGas(weiValue: BigNumber): Promise<{
    estimatedL1Gas: BigNumber
    estimatedL2Gas: BigNumber
    estimatedL2SubmissionCost: BigNumber
  }> {
    if (isDepositMode) {
      const result = await arbTokenBridge.eth.depositEstimateGas({
        amount: weiValue
      })

      return result
    }

    const result = await arbTokenBridge.eth.withdrawEstimateGas({
      amount: weiValue
    })

    return { ...result, estimatedL2SubmissionCost: BigNumber.from(0) }
  }

  type NetworkListboxesProps = {
    from: Omit<NetworkListboxProps, 'label'>
    to: Omit<NetworkListboxProps, 'label'>
  }

  const networkListboxProps: NetworkListboxesProps = useMemo(() => {
    const options = getListboxOptionsFromL1Network(l1.network)

    function updatePreferredL2Chain(l2ChainId: number) {
      setQueryParams({ l2ChainId })
    }

    if (isDepositMode) {
      return {
        from: {
          disabled: true,
          options: [from],
          value: from,
          onChange: () => {}
        },
        to: {
          disabled: false,
          options,
          value: to,
          onChange: async network => {
            // Selecting the same chain
            if (to.chainID === network.chainID) {
              return
            }

            if (isConnectedToArbitrum) {
              // In deposit mode, if we are connected to a different L2 network
              //
              // 1) Switch to the L1 network (to be able to initiate a deposit)
              // 2) Select the preferred L2 network
              try {
                await app.changeNetwork?.(l1.network)
                updatePreferredL2Chain(network.chainID)
              } catch (error: any) {
                // 4001 - User rejected the request
                if (error.code !== 4001) {
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
        disabled: false,
        options,
        value: from,
        onChange: async network => {
          // Selecting the same chain
          if (from.chainID === network.chainID) {
            return
          }

          // In withdraw mode we always switch to the L2 network
          try {
            await app.changeNetwork?.(network)
            updatePreferredL2Chain(network.chainID)
          } catch (error: any) {
            // 4001 - User rejected the request
            if (error.code !== 4001) {
              Sentry.captureException(error)
            }
          }
        }
      },
      to: {
        disabled: true,
        options: [to],
        value: to,
        onChange: () => {}
      }
    }
  }, [isDepositMode, isConnectedToArbitrum, l1.network, from, to, history])

  async function setMaxAmount() {
    const ethBalance = isDepositMode ? ethL1Balance : ethL2Balance

    const tokenBalance = isDepositMode
      ? tokenBalances.ethereum
      : tokenBalances.arbitrum

    if (selectedToken) {
      if (!tokenBalance) {
        return
      }

      // For tokens, we can set the max amount, and have the gas summary component handle the rest
      setAmount(utils.formatUnits(tokenBalance, selectedToken?.decimals || 18))
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
  }

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
                  on={app.isDepositMode ? 'ethereum' : 'arbitrum'}
                  forToken={selectedToken}
                  prefix={selectedToken ? 'Balance: ' : ''}
                />
                <ETHBalance
                  on={app.isDepositMode ? 'ethereum' : 'arbitrum'}
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
              loading: loadingMaxAmount,
              onClick: setMaxAmount
            }}
            errorMessage={errorMessageText}
            disabled={isSwitchingL2Chain}
            value={amount}
            onChange={e => setAmount(e.target.value)}
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
          onClick={switchNetworks}
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
                  on={app.isDepositMode ? 'arbitrum' : 'ethereum'}
                  forToken={selectedToken}
                  prefix={selectedToken ? 'Balance: ' : ''}
                />
                <ETHBalance
                  on={app.isDepositMode ? 'arbitrum' : 'ethereum'}
                  prefix={selectedToken ? '' : 'Balance: '}
                />
              </>
            )}
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>
      </NetworkContainer>

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
