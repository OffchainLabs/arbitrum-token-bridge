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
import React, { PropsWithChildren } from 'react'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported'

import { useETHPrice } from '../../../hooks/useETHPrice'
import { isNetwork } from '../../../util/networks'
import { Tooltip } from '../../common/Tooltip'
import { ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { getConfirmationTime } from '../../../util/WithdrawalUtils'
import { shortenAddress } from '../../../util/CommonUtils'
import { useAppContextState } from '../../App/AppContext'

export type BadgeType = 'security-guaranteed' | 'best-deal' | 'fastest'
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
  tag?: BadgeType | BadgeType[]
  selected: boolean
  onSelectedRouteClick: SetRoute
}

function Tag({
  children,
  className
}: PropsWithChildren<{ className: string }>) {
  return (
    <div className="flex">
      <div
        className={twMerge(
          'flex h-fit items-center space-x-1 rounded-full px-2 py-1 text-xs',
          className
        )}
      >
        <span>{children}</span>
      </div>
    </div>
  )
}

function getBadgeFromBadgeType(badgeType: BadgeType) {
  switch (badgeType) {
    case 'security-guaranteed': {
      return (
        <Tag className="bg-lime-dark text-lime" key="security-guaranteed">
          Security guaranteed by Arbitrum
        </Tag>
      )
    }
    case 'best-deal': {
      return (
        <Tag className="bg-lilac text-white" key="best-deal">
          Best deal
        </Tag>
      )
    }
    case 'fastest': {
      return (
        <Tag className="bg-lilac text-white" key="fastest">
          Fastest
        </Tag>
      )
    }
  }
}

function getBadges(badgeTypes: BadgeType | BadgeType[]) {
  if (Array.isArray(badgeTypes)) {
    return badgeTypes.map(getBadgeFromBadgeType)
  }

  return getBadgeFromBadgeType(badgeTypes)
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
    selected,
    bridgeFee,
    tag,
    onSelectedRouteClick
  }: RouteProps) => {
    const {
      layout: { isTransferring: isDisabled }
    } = useAppContextState()
    const [networks] = useNetworks()
    const { childChainProvider, isDepositMode } =
      useNetworksRelationship(networks)
    const childNativeCurrency = useNativeCurrency({
      provider: childChainProvider
    })
    const [_token] = useSelectedToken()
    const [{ amount2, destinationAddress }] = useArbQueryParams()
    const isBatchTransferSupported = useIsBatchTransferSupported()

    const token = overrideToken || _token || childNativeCurrency

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
      <button
        className={twMerge(
          'relative flex max-w-[calc(100vw_-_40px)] flex-col gap-4 rounded bg-[#303030] px-4 py-3 text-left text-sm text-white ring-1 ring-[#ffffff33] transition-colors md:flex-row',
          'focus-visible:!outline-none',
          'focus-within:bg-[#474747] hover:bg-[#474747]', // focused state
          !isDisabled && selected && 'bg-[#474747] ring-[#5F7D5B]'
        )}
        onClick={() => onSelectedRouteClick(type)}
        disabled={isDisabled}
        aria-label={`Route ${type}`}
      >
        <div className="flex flex-col md:min-w-36">
          <span className="flex gap-1">
            {destinationAddress ? (
              <Tooltip content={destinationAddress}>
                {shortenAddress(destinationAddress)}
              </Tooltip>
            ) : (
              'You'
            )}{' '}
            will receive:
          </span>
          <div className="flex flex-col text-lg">
            <div className="flex flex-row items-center gap-1">
              <TokenLogo
                srcOverride={'logoURI' in token ? token.logoURI : null}
                fallback={
                  <div className="bg-gray-dark h-5 w-5 min-w-5 rounded-full" />
                }
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
                <TokenLogo
                  srcOverride={null}
                  fallback={
                    <div className="bg-gray-dark h-5 w-5 min-w-5 rounded-full" />
                  }
                />
                {formatAmount(Number(amount2), {
                  symbol: childNativeCurrency.symbol
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-3">
          <div className="flex flex-row gap-3 md:flex-col md:justify-between">
            <div className="flex items-center">
              <ClockIcon width={18} height={18} className="-ml-[1px]" />
              <span className="ml-1 whitespace-nowrap">
                {dayjs().add(durationMs, 'millisecond').fromNow(true)}
              </span>
              {fastWithdrawalActive && (
                <div className="flex items-center">
                  <Tooltip
                    content={
                      'Fast Withdrawals relies on a committee of validators. In the event of a committee outage, your withdrawal falls back to the 7 day challenge period secured by Arbitrum Fraud Proofs.'
                    }
                  >
                    <InformationCircleIcon className="ml-1 h-3 w-3" />
                  </Tooltip>
                </div>
              )}
            </div>

            <div className="flex min-w-0 items-center">
              <SafeImage
                src={bridgeIconURI}
                width={15}
                height={15}
                alt="bridge"
                className="max-h-3 max-w-3 rounded-full"
                fallback={
                  <div className="bg-gray-dark h-3 w-3 min-w-3 rounded-full" />
                }
              />
              <div className="truncate">
                <span className="ml-1 whitespace-nowrap">{bridge}</span>
              </div>
            </div>
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
                              utils.formatEther(BigNumber.from(gasEth.gasCost))
                            )
                          )
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div aria-label="Route gas">{'N/A'}</div>
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
                        Number(utils.formatEther(BigNumber.from(bridgeFee.fee)))
                      )
                    )}
                  </div>
                )}
              </div>
            </Tooltip>
          )}
        </div>

        {tag ? (
          <div className="invisible absolute right-2 top-2 flex gap-1 md:visible">
            {getBadges(tag)}
          </div>
        ) : null}
      </button>
    )
  }
)

Route.displayName = 'Route'
