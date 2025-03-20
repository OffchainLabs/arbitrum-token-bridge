import Image from 'next/image'
import dayjs from 'dayjs'
import { SafeImage } from '../../common/SafeImage'
import { BigNumber, constants, utils } from 'ethers'
import { twMerge } from 'tailwind-merge'
import { formatAmount, formatUSD } from '../../../util/NumberUtils'
import { Loader } from '../../common/atoms/Loader'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { RouteType, SetRoute } from '../hooks/useRouteStore'
import { TokenLogo } from '../TokenLogo'
import React from 'react'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported'

import { useETHPrice } from '../../../hooks/useETHPrice'
import { isNetwork } from '../../../util/networks'
import { Tooltip } from '../../common/Tooltip'
import { ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { getConfirmationTime } from '../../../util/WithdrawalUtils'

export type BadgeType = 'security-guaranteed'
export type Token = {
  address: string
  decimals: number
  symbol: string
  logoURI?: string
}
export type RouteGas = { gasCost: string | undefined; gasToken: Token }
export type RouteProps = {
  type: RouteType
  amountReceived: string
  durationMs: number
  isLoadingGasEstimate: boolean
  /** Allow overrides of displayed token */
  overrideToken?: Token
  /** We might have multiple gas token, for example an ER20 deposit to XAI from Arb1 */
  gasCost: RouteGas[] | undefined
  bridgeFee?: { fee: string | undefined; token: Token }
  bridge: string
  bridgeIconURI: string
  tag?: BadgeType
  selected: boolean
  onSelectedRouteClick: SetRoute
}

function getBridgeConfigFromType(type: RouteType) {
  switch (type) {
    case 'arbitrum': {
      return {
        name: 'Arbitrum',
        icon: '/icons/arbitrum.svg',
        width: 13,
        height: 15
      }
    }
    case 'oftV2': {
      return {
        name: 'LayerZero',
        icon: '/icons/layerzero.svg',
        width: 8,
        height: 15
      }
    }
    case 'cctp': {
      return {
        name: 'CCTP',
        icon: '/images/CctpLogoColor.svg',
        width: 15,
        height: 15
      }
    }
  }
}

function getBadge(badgeType: BadgeType) {
  switch (badgeType) {
    case 'security-guaranteed': {
      return (
        <div className="flex">
          <div className="flex h-fit items-center space-x-1 rounded-full bg-lime-dark p-2 text-xs text-lime">
            <span>Security guaranteed by Arbitrum</span>
          </div>
        </div>
      )
    }
  }
}

export const Route = React.memo(
  ({
    type,
    bridge,
    bridgeIconURI,
    durationMs,
    amountReceived,
    isLoadingGasEstimate,
    overrideToken,
    gasCost,
    tag,
    selected,
    bridgeFee,
    onSelectedRouteClick
  }: RouteProps) => {
    const [networks] = useNetworks()
    const { childChainProvider, isDepositMode } =
      useNetworksRelationship(networks)
    const childNativeCurrency = useNativeCurrency({
      provider: childChainProvider
    })
    const [_token] = useSelectedToken()
    const [{ amount2 }] = useArbQueryParams()
    const isBatchTransferSupported = useIsBatchTransferSupported()

    const token = overrideToken || _token || childNativeCurrency

    const { name, icon, width, height } = getBridgeConfigFromType(type)
    const { isTestnet } = isNetwork(networks.sourceChain.id)
    const { ethToUSD } = useETHPrice()
    // Only display USD values for ETH
    const showUsdValueForReceivedToken = !isTestnet && !('address' in token)

    const { fastWithdrawalActive } = !isDepositMode
      ? getConfirmationTime(networks.sourceChain.id)
      : { fastWithdrawalActive: false }

    /* Only show USD values if gas is paid in ETH and we're not on testnet */
    const gasEth =
      !isTestnet &&
      gasCost &&
      gasCost.find(({ gasToken }) => gasToken.address === constants.AddressZero)

    const showUSDValueForBridgeFee =
      !isTestnet &&
      bridgeFee &&
      bridgeFee.token.address === constants.AddressZero

    return (
      <div
        className={twMerge(
          'group cursor-pointer rounded text-white ring-1 ring-[#ffffff33] transition-colors',
          selected && 'ring-2 ring-[#5F7D5B]'
        )}
        onClick={() => onSelectedRouteClick(type)}
        aria-label={`Route ${type}`}
      >
        <div
          className={twMerge(
            'bg-gray-8 flex h-8 items-center rounded-t py-2 pl-4 pr-2 text-xs',
            selected && 'bg-[#5F7D5B]'
          )}
        >
          <Image
            src={icon}
            width={width}
            height={height}
            alt="protocol"
            className="mr-1"
          />
          Powered by {name}
          {selected && <CheckCircleIcon width={22} className="ml-auto" />}
        </div>
        <div
          className={twMerge(
            'relative flex gap-4 rounded-b bg-[#303030] px-4 py-3 text-sm transition-colors group-hover:bg-[#474747]',
            selected && 'bg-[#474747]'
          )}
        >
          <div className="flex flex-col">
            <span>You will receive:</span>
            <div className="flex flex-col text-lg">
              <div className="flex flex-row items-center gap-1">
                <TokenLogo
                  srcOverride={'logoURI' in token ? token.logoURI : null}
                />
                {formatAmount(Number(amountReceived))} {token.symbol}
                <div className="text-sm">
                  {showUsdValueForReceivedToken && (
                    <div className="text-sm tabular-nums opacity-80">
                      {formatUSD(ethToUSD(Number(amountReceived)))}
                    </div>
                  )}
                </div>
              </div>
              {isBatchTransferSupported && Number(amount2) > 0 && (
                <div className="flew-row flex items-center gap-1">
                  <TokenLogo srcOverride={null} />
                  {formatAmount(Number(amount2), {
                    symbol: childNativeCurrency.symbol
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3">
            <div className="flex items-center">
              <ClockIcon width={18} height={18} className="-ml-[1px]" />
              <span className="ml-1">
                {dayjs().add(durationMs, 'millisecond').fromNow(true)}
              </span>
              {fastWithdrawalActive && (
                <div className="flex items-center">
                  <Tooltip
                    content={
                      'Fast Withdrawals relies on a committee of validators. In the event of a committee outage, your withdrawal falls back to the 7 day challenge period secured by Arbitrum Fraud Proofs.'
                    }
                  >
                    <InformationCircleIcon className="h-3 w-3 sm:ml-1" />
                  </Tooltip>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <SafeImage
                src={bridgeIconURI}
                width={15}
                height={15}
                alt="bridge"
                className="max-h-3 max-w-3 rounded-full"
              />
              <span className="ml-1">{bridge}</span>
            </div>

            <Tooltip content={'The gas fees paid to operate the network'}>
              <div className="flex items-center">
                <Image src="/icons/gas.svg" width={15} height={15} alt="gas" />
                <span className="ml-1">
                  {isLoadingGasEstimate ? (
                    <Loader size="small" color="white" />
                  ) : gasCost ? (
                    <div
                      className="flex items-center gap-1"
                      aria-label="Route gas"
                    >
                      {gasCost
                        .map(({ gasCost, gasToken }) =>
                          formatAmount(BigNumber.from(gasCost), {
                            decimals: gasToken.decimals,
                            symbol: gasToken.symbol
                          })
                        )
                        .join(' and ')}
                      {gasEth && (
                        <div className="text-sm tabular-nums opacity-80">
                          {formatUSD(
                            ethToUSD(
                              Number(
                                utils.formatEther(
                                  BigNumber.from(gasEth.gasCost)
                                )
                              )
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
            </Tooltip>

            {bridgeFee && (
              <Tooltip content={'The fee the bridge takes'}>
                <div className="flex items-center gap-1">
                  <Image
                    src="/icons/bridge.svg"
                    width={15}
                    height={15}
                    alt="bridge fee"
                  />
                  <span>
                    {formatAmount(BigNumber.from(bridgeFee.fee), {
                      decimals: bridgeFee.token.decimals,
                      symbol: bridgeFee.token.symbol
                    })}
                  </span>
                  {showUSDValueForBridgeFee && (
                    <div className="text-sm tabular-nums opacity-80">
                      {formatUSD(
                        ethToUSD(
                          Number(
                            utils.formatEther(BigNumber.from(bridgeFee.fee))
                          )
                        )
                      )}
                    </div>
                  )}
                </div>
              </Tooltip>
            )}
          </div>

          {tag ? (
            <div className="absolute right-2 top-2">{getBadge(tag)}</div>
          ) : null}
        </div>
      </div>
    )
  }
)

Route.displayName = 'Route'
