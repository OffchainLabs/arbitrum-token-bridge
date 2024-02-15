import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowsUpDownIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { BigNumber, constants, utils } from 'ethers'
import { useAccount } from 'wagmi'

import { useAppState } from '../../state'
import { ChainId } from '../../util/networks'
import { useDestinationAddressStore } from './AdvancedSettings'
import { useDialog } from '../common/Dialog'
import {
  AmountQueryParamEnum,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'

import {
  calculateEstimatedL1GasFees,
  calculateEstimatedL2GasFees
} from './TransferPanelMainUtils'
import { useBalance } from '../../hooks/useBalance'
import { useGasPrice } from '../../hooks/useGasPrice'
import { useAccountType } from '../../hooks/useAccountType'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { withdrawInitTxEstimateGas } from '../../util/WithdrawalUtils'
import { GasEstimates } from '../../hooks/arbTokenBridge.types'
import {
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  isTokenSepoliaUSDC,
  isTokenMainnetUSDC
} from '../../util/TokenUtils'
import { OneNovaTransferDialog } from './OneNovaTransferDialog'
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { defaultErc20Decimals } from '../../defaults'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { TransferDisabledDialog } from './TransferDisabledDialog'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import {
  Balances,
  useSelectedTokenBalances
} from '../../hooks/TransferPanel/useSelectedTokenBalances'
import { SourceNetworkContainer } from './TransferPanelNetworkContainers/SourceNetworkContainer'
import { DestinationNetworkContainer } from './TransferPanelNetworkContainers/DestinationNetworkContainer'

function shouldOpenOneNovaDialog(selectedChainIds: number[]) {
  return [ChainId.ArbitrumOne, ChainId.ArbitrumNova].every(chainId =>
    selectedChainIds.includes(chainId)
  )
}

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

export function TransferPanelMain({
  amount,
  setAmount
}: {
  amount: string
  setAmount: (value: string) => void
}) {
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const l1GasPrice = useGasPrice({ provider: parentChainProvider })
  const l2GasPrice = useGasPrice({ provider: childChainProvider })

  const {
    app: { selectedToken }
  } = useAppState()
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
    provider: parentChainProvider,
    walletAddress: l1WalletAddress
  })
  const {
    eth: [ethL2Balance],
    erc20: [, updateErc20L2Balances]
  } = useBalance({
    provider: childChainProvider,
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

  const customFeeTokenBalances: Balances = useMemo(() => {
    if (!nativeCurrency.isCustom) {
      return { l1: ethL1Balance, l2: ethL2Balance }
    }

    return {
      l1: erc20L1Balances?.[nativeCurrency.address] ?? null,
      l2: ethL2Balance
    }
  }, [nativeCurrency, ethL1Balance, ethL2Balance, erc20L1Balances])

  const [loadingMaxAmount, setLoadingMaxAmount] = useState(false)
  const [oneNovaTransferDialogProps, openOneNovaTransferDialog] = useDialog()
  const [
    oneNovaTransferDestinationNetworkId,
    setOneNovaTransferDestinationNetworkId
  ] = useState<number | null>(null)
  const selectedTokenBalances = useSelectedTokenBalances()
  const isMaxAmount = amount === AmountQueryParamEnum.MAX

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

  function onDestinationNetworkChange(networkId: number) {
    if (shouldOpenOneNovaDialog([networkId, networks.sourceChain.id])) {
      setOneNovaTransferDestinationNetworkId(networkId)
      openOneNovaTransferDialog()
      return
    }
  }

  return (
    <div className="flex flex-col pb-6">
      <SourceNetworkContainer
        setMaxAmount={setMaxAmount}
        loadingMaxAmount={loadingMaxAmount}
      />
      <SwitchNetworksButton />
      <DestinationNetworkContainer onChange={onDestinationNetworkChange} />

      <TransferDisabledDialog />
      <OneNovaTransferDialog
        {...oneNovaTransferDialogProps}
        destinationChainId={oneNovaTransferDestinationNetworkId}
        amount={amount}
      />
    </div>
  )
}
