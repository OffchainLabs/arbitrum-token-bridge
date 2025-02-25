import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { constants, utils } from 'ethers'
import { Route, RouteProps } from './Route'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { ether } from '../../../constants'
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

const commonUsdcToken = {
  decimals: 6,
  address: CommonAddress.Ethereum.USDC
}

const bridgedUsdcToken = {
  ...commonUsdcToken,
  name: 'Bridged USDC',
  symbol: 'USDC.e',
  l2Address: CommonAddress.ArbitrumOne['USDC.e']
}

const nativeUsdcToken = {
  ...commonUsdcToken,
  name: 'USDC',
  symbol: 'USDC',
  l2Address: CommonAddress.ArbitrumOne.USDC
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

export function ArbitrumRoute({
  onRouteSelected
}: Pick<RouteProps, 'onRouteSelected'>) {
  const amount = useAmountBigNumber()
  const [networks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChainProvider,
    isDepositMode,
    isTeleportMode
  } = useNetworksRelationship(networks)
  const [token] = useSelectedToken()
  const { isTestnet, isOrbitChain } = isNetwork(childChain.id)
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
  const { selectedRoute } = useRouteStore()

  const estimatedTotalGasFees =
    gasSummaryStatus === 'loading' ||
    typeof estimatedChildChainGasFees == 'undefined' ||
    typeof estimatedParentChainGasFees == 'undefined'
      ? undefined
      : estimatedParentChainGasFees + estimatedChildChainGasFees

  /**
   * If source and destination chains are using the same currency, we display combined cost for both child and parent chain.
   * If they use a different currency, we display cost for child chain only
   */
  const gasCost =
    childChainNativeCurrency.isCustom && parentChainNativeCurrency.isCustom
      ? estimatedTotalGasFees
      : estimatedChildChainGasFees

  const gasToken =
    'address' in childChainNativeCurrency
      ? childChainNativeCurrency
      : { ...ether, address: constants.AddressZero }

  /**
   * For USDC:
   * - Withdrawing USDC.e, we receive USDC on Mainnet
   * - Depositing USDC, we receive USDC.e on Arbitrum
   */
  const isUsdcTransfer = isTokenNativeUSDC(token?.address)
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
      isLoadingGasEstimate={gasSummaryStatus === 'loading'}
      overrideToken={isUsdcTransfer ? overrideToken : undefined}
      gasCost={
        gasCost
          ? utils
              .parseUnits(
                gasCost.toFixed(18),
                childChainNativeCurrency.decimals
              )
              .toString()
          : undefined
      }
      gasToken={gasToken}
      tag={'security-guaranteed'}
      onRouteSelected={onRouteSelected}
      selected={selectedRoute === 'arbitrum'}
    />
  )
}
