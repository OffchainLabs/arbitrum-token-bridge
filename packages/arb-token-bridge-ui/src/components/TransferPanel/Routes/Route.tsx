import Image from 'next/image'
import dayjs from 'dayjs'
import { SafeImage } from '../../common/SafeImage'
import { BigNumber, constants, utils } from 'ethers'
import { twMerge } from 'tailwind-merge'
import { formatAmount, formatUSD } from '../../../util/NumberUtils'
import { Loader } from '../../common/atoms/Loader'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import {
  useNativeCurrency,
  NativeCurrency
} from '../../../hooks/useNativeCurrency'
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
import {
  ClockIcon,
  InformationCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { getConfirmationTime } from '../../../util/WithdrawalUtils'
import { shortenAddress } from '../../../util/CommonUtils'
import { useAppContextState } from '../../App/AppContext'
import { Token } from '../../../pages/api/crosschain-transfers/types'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { useMode } from '../../../hooks/useMode'

// Types
export type BadgeType = 'security-guaranteed' | 'best-deal' | 'fastest'

export type RouteGas = { gasCost: string | undefined; gasToken: Token }
export type RouteProps = {
  type: RouteType
  amountReceived: string
  durationMs: number
  isLoadingGasEstimate: boolean
  overrideToken?: ERC20BridgeToken
  gasCost: RouteGas[] | undefined
  bridgeFee?: { fee: string | undefined; token: Token }
  bridge: string
  bridgeIconURI: string
  tag?: BadgeType | BadgeType[]
  selected: boolean
  onSelectedRouteClick: SetRoute
}

// Badge Components
function Tag({
  children,
  className
}: PropsWithChildren<{ className: string }>) {
  const { embedMode } = useMode()

  return (
    <div className="flex">
      <div
        className={twMerge(
          'flex h-fit items-center space-x-1 truncate rounded px-2 py-1 text-center text-xs',
          embedMode && 'min-[850px]:hidden',
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
        <Tag
          className="hidden bg-lime-dark text-lime md:flex"
          key="security-guaranteed"
        >
          Secured by Arbitrum
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

const DelimiterDot = () => (
  <div className="h-[5px] w-[5px] rounded-full bg-white" />
)

// Route Amount Component
type RouteAmountProps = {
  amountReceived: string
  token: ERC20BridgeToken | NativeCurrency
  showUsdValueForReceivedToken: boolean
  isBatchTransferSupported: boolean
  amount2?: string
  childNativeCurrency: ERC20BridgeToken | NativeCurrency
}

const RouteAmount = ({
  amountReceived,
  token,
  showUsdValueForReceivedToken,
  isBatchTransferSupported,
  amount2,
  childNativeCurrency
}: RouteAmountProps) => {
  const { ethToUSD } = useETHPrice()

  return (
    <div className="flex min-w-36 flex-col gap-1">
      <div className="flex flex-col text-lg">
        <div className="flex flex-row items-center gap-[15px]">
          <TokenLogo
            className="h-[40px] w-[40px] min-w-[40px]"
            srcOverride={'logoURI' in token ? token.logoURI : null}
            fallback={
              <div className="h-[40px] w-[40px] min-w-[40px] rounded-full bg-gray-dark" />
            }
          />
          <div className="flex flex-col">
            <div className="text-base">
              {formatAmount(Number(amountReceived))} {token.symbol}
            </div>

            {showUsdValueForReceivedToken && (
              <div className="text-sm tabular-nums text-white/50">
                {formatUSD(ethToUSD(Number(amountReceived)))}
              </div>
            )}
          </div>
        </div>

        {isBatchTransferSupported && Number(amount2) > 0 && (
          <div className="flew-row flex items-center gap-1">
            <TokenLogo
              className="h-[40px] w-[40px] min-w-[40px]"
              srcOverride={null}
              fallback={
                <div className="h-[40px] w-[40px] min-w-[40px] rounded-full bg-gray-dark" />
              }
            />
            {formatAmount(Number(amount2), {
              symbol: childNativeCurrency.symbol
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Route Duration Component
type RouteDurationProps = {
  durationMs: number
  fastWithdrawalActive: boolean
}

const RouteDuration = ({
  durationMs,
  fastWithdrawalActive
}: RouteDurationProps) => (
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
)

// Route Bridge Component
type RouteBridgeProps = {
  bridge: string
  bridgeIconURI: string
}

const RouteBridge = ({ bridge, bridgeIconURI }: RouteBridgeProps) => (
  <div className="flex min-w-0 items-center">
    <SafeImage
      src={bridgeIconURI}
      width={15}
      height={15}
      alt="bridge"
      className="max-h-3 max-w-3 rounded-full"
      fallback={<div className="h-3 w-3 min-w-3 rounded-full bg-gray-dark" />}
    />
    <div className="truncate">
      <span className="ml-1 whitespace-nowrap">{bridge}</span>
    </div>
  </div>
)

// Route Fees Component
type RouteFeesProps = {
  isLoadingGasEstimate: boolean
  gasCost: RouteGas[] | undefined
  gasEth?: RouteGas | false
  bridgeFee?: { fee: string | undefined; token: Token }
  showUSDValueForBridgeFee: boolean
}

const RouteFees = ({
  isLoadingGasEstimate,
  gasCost,
  gasEth,
  bridgeFee,
  showUSDValueForBridgeFee
}: RouteFeesProps) => {
  const { ethToUSD } = useETHPrice()

  return (
    <>
      <Tooltip content={'The gas fees paid to operate the network'}>
        <div className="flex items-center">
          <Image src="/icons/gas.svg" width={14} height={14} alt="gas" />
          <span className="ml-1">
            {isLoadingGasEstimate ? (
              <Loader size="small" color="white" />
            ) : gasCost ? (
              <div className="flex items-center gap-1" aria-label="Route gas">
                {gasCost
                  .map(({ gasCost, gasToken }) =>
                    formatAmount(BigNumber.from(gasCost), {
                      decimals: gasToken.decimals,
                      symbol: gasToken.symbol
                    })
                  )
                  .join(' and ')}
                {gasEth && (
                  <div className="text-xs tabular-nums opacity-80">
                    (
                    {formatUSD(
                      ethToUSD(
                        Number(
                          utils.formatEther(BigNumber.from(gasEth.gasCost))
                        )
                      )
                    )}
                    )
                  </div>
                )}
              </div>
            ) : (
              <div aria-label="Route gas">{'N/A'}</div>
            )}
          </span>
        </div>
      </Tooltip>

      {bridgeFee && <DelimiterDot />}

      {bridgeFee && (
        <Tooltip content={'The fee the bridge takes'}>
          <div className="flex items-center gap-1">
            <Image
              src="/icons/bridge.svg"
              width={18}
              height={18}
              alt="bridge fee"
            />
            <div className="flex flex-row items-center gap-1">
              <span>
                {formatAmount(BigNumber.from(bridgeFee.fee), {
                  decimals: bridgeFee.token.decimals,
                  symbol: bridgeFee.token.symbol
                })}
              </span>
              {showUSDValueForBridgeFee && (
                <div className="text-xs tabular-nums opacity-80">
                  (
                  {formatUSD(
                    ethToUSD(
                      Number(utils.formatEther(BigNumber.from(bridgeFee.fee)))
                    )
                  )}
                  )
                </div>
              )}
            </div>
          </div>
        </Tooltip>
      )}
    </>
  )
}

// Route Badge Component
type RouteBadgeProps = {
  tag?: BadgeType | BadgeType[]
}

const RouteBadge = ({ tag }: RouteBadgeProps) => {
  if (!tag) return null

  return <div className="flex gap-1">{getBadges(tag)}</div>
}

// Main Route Component
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
    const [{ theme }] = useArbQueryParams()

    const token = overrideToken || _token || childNativeCurrency

    const { isTestnet } = isNetwork(networks.sourceChain.id)
    const showUsdValueForReceivedToken = !isTestnet && !('address' in token)

    const { fastWithdrawalActive } = !isDepositMode
      ? getConfirmationTime(networks.sourceChain.id)
      : { fastWithdrawalActive: false }

    const gasEth =
      (!isTestnet &&
        gasCost &&
        gasCost.find(
          ({ gasToken }) => gasToken.address === constants.AddressZero
        )) ||
      undefined

    const showUSDValueForBridgeFee =
      (!isTestnet &&
        bridgeFee &&
        bridgeFee.token.address === constants.AddressZero) ||
      false

    return (
      <button
        className={twMerge(
          'relative flex max-w-[calc(100vw_-_40px)] flex-col gap-[15px] rounded border border-[#ffffff33] bg-[#ffffff1a] p-3 text-left text-sm text-white transition-colors',
          'focus-visible:!outline-none',
          'focus-within:bg-[#ffffff36] hover:bg-[#ffffff36]',
          !isDisabled && selected && 'border-primary-cta'
        )}
        style={
          !isDisabled && selected
            ? {
                borderColor: theme.primaryCtaColor ?? '#5F7D5B',
                backgroundColor: theme.primaryCtaColor
                  ? `${theme.primaryCtaColor}60`
                  : '#5F7D5B60'
              }
            : {}
        }
        onClick={() => onSelectedRouteClick(type)}
        disabled={isDisabled}
        aria-label={`Route ${type}`}
      >
        <div className="flex flex-row flex-nowrap items-center justify-between gap-2">
          <RouteAmount
            amountReceived={amountReceived}
            token={token}
            showUsdValueForReceivedToken={showUsdValueForReceivedToken}
            isBatchTransferSupported={isBatchTransferSupported}
            amount2={amount2}
            childNativeCurrency={childNativeCurrency}
          />

          <div className="flex flex-nowrap gap-3">
            <div className="flex flex-nowrap items-center gap-1">
              <span className="text-sm text-white/50">via</span>{' '}
              <RouteBridge bridge={bridge} bridgeIconURI={bridgeIconURI} />
            </div>
            <RouteBadge tag={tag} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs opacity-70">
          <RouteDuration
            durationMs={durationMs}
            fastWithdrawalActive={fastWithdrawalActive}
          />

          <DelimiterDot />

          <RouteFees
            isLoadingGasEstimate={isLoadingGasEstimate}
            gasCost={gasCost}
            gasEth={gasEth}
            bridgeFee={bridgeFee}
            showUSDValueForBridgeFee={showUSDValueForBridgeFee}
          />

          {/* if custom destination address is the receiver, explicitly show it */}
          {destinationAddress && <DelimiterDot />}
          {destinationAddress && (
            <Tooltip
              content={`${destinationAddress} will be the recipient of the funds. Be sure you mean to send it here.`}
            >
              <div className="flex items-center gap-1 text-xs">
                <UserIcon className="h-3 w-3" />
                {shortenAddress(destinationAddress)} will receive
              </div>
            </Tooltip>
          )}
        </div>
      </button>
    )
  }
)

Route.displayName = 'Route'
