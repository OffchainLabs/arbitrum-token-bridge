import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { constants, utils } from 'ethers'
import { Route, Token } from './Route'
import {
  UseGasSummaryResult,
  useGasSummary
} from '../../../hooks/TransferPanel/useGasSummary'
import {
  NativeCurrency,
  useNativeCurrency
} from '../../../hooks/useNativeCurrency'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import {
  getOrbitDepositDuration,
  getStandardDepositDuration,
  getWithdrawalDuration
} from '../../../hooks/useTransferDuration'
import { isNetwork } from '../../../util/networks'
import dayjs from 'dayjs'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { isTokenNativeUSDC } from '../../../util/TokenUtils'
import { useRouteStore } from '../hooks/useRouteStore'
import { useMemo } from 'react'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { shallow } from 'zustand/shallow'

const commonUsdcToken: Token = {
  decimals: 6,
  address: CommonAddress.Ethereum.USDC,
  symbol: 'placeholder',
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png'
}

const bridgedUsdcToken: Token = {
  ...commonUsdcToken,
  symbol: 'USDC.e'
}

const nativeUsdcToken: Token = {
  ...commonUsdcToken,
  symbol: 'USDC'
}

function getDuration({
  isTestnet,
  sourceChainId,
  isTeleportMode,
  isWithdrawal,
  isOrbitChain
}: {
  isTestnet: boolean
  sourceChainId: number
  isTeleportMode: boolean
  isWithdrawal: boolean
  isOrbitChain: boolean
}) {
  if (isTeleportMode) {
    return (
      getStandardDepositDuration(isTestnet) + getOrbitDepositDuration(isTestnet)
    )
  }

  if (isWithdrawal) {
    return getWithdrawalDuration({
      createdAt: dayjs().valueOf(),
      sourceChainId: sourceChainId
    })
  }

  if (isOrbitChain) {
    return getOrbitDepositDuration(isTestnet)
  }

  return getStandardDepositDuration(isTestnet)
}

function getGasCostAndToken({
  childChainNativeCurrency,
  parentChainNativeCurrency,
  gasSummaryStatus,
  estimatedChildChainGasFees,
  estimatedParentChainGasFees,
  isDepositMode,
  selectedToken
}: {
  childChainNativeCurrency: NativeCurrency
  parentChainNativeCurrency: NativeCurrency
  gasSummaryStatus: UseGasSummaryResult['status']
  estimatedChildChainGasFees: UseGasSummaryResult['estimatedChildChainGasFees']
  estimatedParentChainGasFees: UseGasSummaryResult['estimatedParentChainGasFees']
  isDepositMode: boolean
  selectedToken: ERC20BridgeToken | null
}): {
  isLoading: boolean
  gasCost: { gasCost: number; gasToken: Token }[] | null
} {
  const sameNativeCurrency =
    childChainNativeCurrency.isCustom === parentChainNativeCurrency.isCustom
  const estimatedTotalGasFees =
    gasSummaryStatus === 'loading' ||
    typeof estimatedChildChainGasFees == 'undefined' ||
    typeof estimatedParentChainGasFees == 'undefined'
      ? undefined
      : estimatedParentChainGasFees + estimatedChildChainGasFees

  const childChainNativeCurrencyWithAddress: Token =
    'address' in childChainNativeCurrency
      ? childChainNativeCurrency
      : { ...childChainNativeCurrency, address: constants.AddressZero }

  const parentChainNativeCurrencyWithAddress: Token =
    'address' in parentChainNativeCurrency
      ? parentChainNativeCurrency
      : { ...parentChainNativeCurrency, address: constants.AddressZero }

  if (typeof estimatedTotalGasFees === 'undefined') {
    return {
      gasCost: null,
      isLoading: true
    }
  }

  /**
   * Same Native Currencies between Parent and Child chains
   * 1. ETH/ER20 deposit: L1->L2
   * 2. ETH/ERC20 withdrawal: L2->L1
   * 3. ETH/ER20 deposit: L2->L3 (ETH as gas token)
   * 4. ETH/ERC20 withdrawal: L3 (ETH as gas token)->L2
   *
   * x ETH
   */
  if (sameNativeCurrency) {
    return {
      isLoading: false,
      gasCost: [
        {
          gasCost: estimatedTotalGasFees,
          gasToken: childChainNativeCurrencyWithAddress
        }
      ]
    }
  }

  /** Different Native Currencies between Parent and Child chains
   *
   *  Custom gas token deposit: L2->Xai
   *  x ETH
   *
   *  ERC20 deposit: L2->Xai
   *  x ETH and x XAI
   *
   *  Custom gas token/ERC20 withdrawal: L3->L2
   *  only show child chain native currency
   *  x XAI
   */
  if (isDepositMode) {
    const gasCost: { gasCost: number; gasToken: Token }[] = [
      {
        gasCost: estimatedParentChainGasFees!,
        gasToken: parentChainNativeCurrencyWithAddress
      }
    ]

    if (selectedToken) {
      gasCost.push({
        gasCost: estimatedChildChainGasFees!,
        gasToken: childChainNativeCurrencyWithAddress
      })
    }

    return {
      gasCost,
      isLoading: false
    }
  }

  return {
    isLoading: false,
    gasCost: [
      {
        gasCost: estimatedChildChainGasFees!,
        gasToken: childChainNativeCurrencyWithAddress
      }
    ]
  }
}

export function ArbitrumCanonicalRoute() {
  const [{ amount }] = useArbQueryParams()
  const [networks] = useNetworks()
  const {
    childChain,
    isTeleportMode,
    childChainProvider,
    parentChainProvider,
    isDepositMode
  } = useNetworksRelationship(networks)
  const {
    status: gasSummaryStatus,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  } = useGasSummary()
  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })
  const parentChainNativeCurrency = useNativeCurrency({
    provider: parentChainProvider
  })
  const { isTestnet, isOrbitChain } = isNetwork(childChain.id)

  const { selectedRoute, setSelectedRoute } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      setSelectedRoute: state.setSelectedRoute
    }),
    shallow
  )
  const [selectedToken] = useSelectedToken()

  const { gasCost, isLoading } = useMemo(
    () =>
      getGasCostAndToken({
        childChainNativeCurrency,
        parentChainNativeCurrency,
        gasSummaryStatus,
        estimatedChildChainGasFees,
        estimatedParentChainGasFees,
        isDepositMode,
        selectedToken
      }),
    [
      childChainNativeCurrency,
      estimatedChildChainGasFees,
      estimatedParentChainGasFees,
      gasSummaryStatus,
      isDepositMode,
      parentChainNativeCurrency,
      selectedToken
    ]
  )

  /**
   * For USDC:
   * - Withdrawing USDC.e, we receive USDC on Mainnet
   * - Depositing USDC, we receive USDC.e on Arbitrum
   */
  const isUsdcTransfer = isTokenNativeUSDC(selectedToken?.address)
  const overrideToken = isDepositMode ? bridgedUsdcToken : nativeUsdcToken
  const durationMs =
    getDuration({
      isTestnet,
      isWithdrawal: !isDepositMode,
      sourceChainId: networks.sourceChain.id,
      isTeleportMode,
      isOrbitChain
    }) *
    60 *
    1_000

  return (
    <Route
      type="arbitrum"
      bridge={'Arbitrum Bridge'}
      bridgeIconURI={'/icons/arbitrum.svg'}
      durationMs={durationMs}
      amountReceived={amount.toString()}
      isLoadingGasEstimate={isLoading}
      overrideToken={isUsdcTransfer ? overrideToken : undefined}
      gasCost={
        gasCost && gasCost.length > 0
          ? gasCost.map(({ gasCost, gasToken }) => ({
              gasCost: utils
                .parseUnits(
                  gasCost.toFixed(childChainNativeCurrency.decimals),
                  gasToken.decimals
                )
                .toString(),
              gasToken
            }))
          : []
      }
      onSelectedRouteClick={setSelectedRoute}
      tag={'security-guaranteed'}
      selected={selectedRoute === 'arbitrum'}
    />
  )
}
