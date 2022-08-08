import React, { useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Listbox } from '@headlessui/react'
import { ChevronDownIcon, SwitchVerticalIcon } from '@heroicons/react/outline'
import Loader from 'react-loader-spinner'
import { BigNumber, utils } from 'ethers'
import { L1Network, L2Network } from '@arbitrum/sdk'
import { l2Networks } from '@arbitrum/sdk-nitro/dist/lib/dataEntities/networks'
import { ERC20BridgeToken } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { isArbitrumNetwork, isNetwork } from '../../util/networks'
import { formatBigNumber } from '../../util/NumberUtils'
import { Transition } from '../common/Transition'
import { ExternalLink } from '../common/ExternalLink'
import { useGasPrice } from '../../hooks/useGasPrice'

import { TransferPanelMainInput } from './TransferPanelMainInput'
import {
  calculateEstimatedL1GasFees,
  calculateEstimatedL2GasFees,
  useETHBalances,
  useTokenBalances
} from './TransferPanelMainUtils'

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
  return (
    <Listbox disabled={disabled} value={value} onChange={onChange}>
      <Listbox.Button
        disabled={disabled}
        className="arb-hover flex w-max items-center space-x-1 rounded-full bg-[rgba(101,109,123,0.8)] px-4 py-3 text-2xl text-white"
      >
        <span>
          {label} {value.name}
        </span>
        {!disabled && <ChevronDownIcon className="h-4 w-4" />}
      </Listbox.Button>
      <Transition>
        <Listbox.Options className="absolute z-20 rounded-full bg-white p-1 shadow-[0px_4px_12px_#9e9e9e]">
          {options.map(option => (
            <Listbox.Option
              key={option.chainID}
              value={option}
              className="cursor-pointer rounded-full px-3 py-1 hover:bg-blue-arbitrum hover:text-white"
            >
              <span className="text-2xl">{value.name}</span>
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Transition>
    </Listbox>
  )
}

function getListboxOptionsFromL1Network(network: L1Network) {
  let options: L2Network[] = []

  network.partnerChainIDs.forEach(chainId => {
    if (l2Networks[chainId]) {
      options.push(l2Networks[chainId])
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
  const isArbitrum = isArbitrumNetwork(network)

  const backgroundClassName = isArbitrum
    ? 'bg-blue-arbitrum'
    : 'bg-purple-ethereum'

  const backgroundImage = isArbitrum
    ? 'url(/images/NetworkBoxArb.png)'
    : 'url(/images/NetworkBoxEth.png)'

  return (
    <div className={`rounded-xl p-2 transition-colors ${backgroundClassName}`}>
      <div
        className="space-y-3.5 bg-contain bg-no-repeat px-4 py-1 sm:flex-row"
        style={{ backgroundImage }}
      >
        {children}
      </div>
    </div>
  )
}

function ETHBalance({ on }: { on: 'ethereum' | 'arbitrum' }) {
  const balances = useETHBalances()
  const balance = balances[on]

  if (!balance) {
    return <Loader type="TailSpin" color="white" height={16} width={16} />
  }

  return (
    <span className="text-xl font-light text-white">
      {formatBigNumber(balance, 18, 5)} ETH
    </span>
  )
}

function TokenBalance({
  forToken,
  on
}: {
  forToken: ERC20BridgeToken | null
  on: 'ethereum' | 'arbitrum'
}) {
  const balances = useTokenBalances(forToken?.address)
  const balance = balances[on]

  if (!forToken) {
    return null
  }

  if (!balance) {
    return <Loader type="TailSpin" color="white" height={16} width={16} />
  }

  return (
    <span className="text-xl font-light text-white">
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
    <div className="flex flex-col items-center space-y-2 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  )
}

export enum TransferPanelMainErrorMessage {
  INSUFFICIENT_FUNDS,
  AMOUNT_TOO_LOW
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
  const { l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()

  const { app } = useAppState()
  const { arbTokenBridge, isDepositMode, selectedToken } = app

  const { l1GasPrice, l2GasPrice } = useGasPrice()

  const [calculatingMaxAmount, setCalculatingMaxAmount] = useState(false)
  const actions = useActions()

  const ethBalances = useETHBalances()
  const tokenBalances = useTokenBalances(selectedToken?.address)

  const externalFrom = isConnectedToArbitrum ? l2.network : l1.network
  const externalTo = isConnectedToArbitrum ? l1.network : l2.network

  const [from, setFrom] = useState<L1Network | L2Network>(externalFrom)
  const [to, setTo] = useState<L1Network | L2Network>(externalTo)

  useEffect(() => {
    setFrom(externalFrom)
    setTo(externalTo)
  }, [externalFrom, externalTo])

  const listboxOptions = useMemo(
    () => getListboxOptionsFromL1Network(l1.network),
    [l1.network]
  )

  // For now, we only want the `to` listbox to be enabled when connected to Mainnet, for switching between One and Nova.
  const toListboxDisabled = useMemo(() => {
    const { isMainnet } = isNetwork(l1.network)

    if (isConnectedToArbitrum || !isMainnet) {
      return true
    }

    return !app.isDepositMode
  }, [isConnectedToArbitrum, l1.network, app.isDepositMode])

  const errorMessageText = useMemo(() => {
    if (typeof errorMessage === 'undefined') {
      return undefined
    }

    if (errorMessage === TransferPanelMainErrorMessage.AMOUNT_TOO_LOW) {
      return 'Sending ~$0 just to pay gas fees seems like a questionable life choice.'
    }

    return `Insufficient balance, please add more to ${
      isDepositMode ? 'L1' : 'L2'
    }.`
  }, [errorMessage, isDepositMode])

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
      const result = await arbTokenBridge.eth.depositEstimateGas(weiValue)
      return result
    }

    const result = await arbTokenBridge.eth.withdrawEstimateGas(weiValue)
    return { ...result, estimatedL2SubmissionCost: BigNumber.from(0) }
  }

  async function setMaxAmount() {
    const ethBalance = isConnectedToArbitrum
      ? ethBalances.arbitrum
      : ethBalances.ethereum

    const tokenBalance = isConnectedToArbitrum
      ? tokenBalances.arbitrum
      : tokenBalances.ethereum

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
      setCalculatingMaxAmount(true)
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
      setCalculatingMaxAmount(false)
    }
  }

  return (
    <div className="flex flex-col px-6 py-6 lg:min-w-[540px] lg:px-0 lg:pl-6">
      <NetworkContainer network={from}>
        <NetworkListboxPlusBalancesContainer>
          <NetworkListbox
            disabled
            label="From:"
            options={[from]}
            value={from}
            onChange={() => {}}
          />
          <BalancesContainer>
            <TokenBalance
              on={app.isDepositMode ? 'ethereum' : 'arbitrum'}
              forToken={selectedToken}
            />
            <ETHBalance on={app.isDepositMode ? 'ethereum' : 'arbitrum'} />
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>

        <TransferPanelMainInput
          maxButtonProps={{
            visible: true,
            loading: calculatingMaxAmount,
            onClick: setMaxAmount
          }}
          errorMessage={errorMessageText}
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
      </NetworkContainer>

      <div className="z-10 flex w-full items-center justify-center lg:h-12">
        <SwitchNetworksButton onClick={switchNetworks} />
      </div>

      <NetworkContainer network={to}>
        <NetworkListboxPlusBalancesContainer>
          <NetworkListbox
            disabled={toListboxDisabled}
            label="To:"
            options={listboxOptions.filter(n => isArbitrumNetwork(n))}
            value={to}
            onChange={network => {
              history.push({
                pathname: '/',
                search: `?l2ChainId=${network.chainID}`
              })
            }}
          />
          <BalancesContainer>
            <TokenBalance
              on={app.isDepositMode ? 'arbitrum' : 'ethereum'}
              forToken={selectedToken}
            />
            <ETHBalance on={app.isDepositMode ? 'arbitrum' : 'ethereum'} />
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>
      </NetworkContainer>

      <span>isDepositMode: {app.isDepositMode.toString()}</span>
    </div>
  )
}
