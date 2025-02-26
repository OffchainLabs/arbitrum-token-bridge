import Image from 'next/image'
import dayjs from 'dayjs'
import { SafeImage } from '../../common/SafeImage'
import { BigNumber } from 'ethers'
import { twMerge } from 'tailwind-merge'
import { formatAmount } from '../../../util/NumberUtils'
import { Loader } from '../../common/atoms/Loader'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { RouteType, useRouteStore } from '../hooks/useRouteStore'
import { SecurityGuaranteed } from '../SecurityLabels'
import { TokenLogo } from '../TokenLogo'
import React from 'react'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported'

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
  bridge: string
  bridgeIconURI: string
  tag?: BadgeType
  selected: boolean
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
      return SecurityGuaranteed
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
    selected
  }: RouteProps) => {
    const [networks] = useNetworks()
    const { childChainProvider } = useNetworksRelationship(networks)
    const childNativeCurrency = useNativeCurrency({
      provider: childChainProvider
    })
    const [_token] = useSelectedToken()
    const isBatchTransferSupported = useIsBatchTransferSupported()
    const [{ amount2 }] = useArbQueryParams()

    const setSelectedRoute = useRouteStore(state => state.setSelectedRoute)

    const token = overrideToken || _token || childNativeCurrency

    const { name, icon, width, height } = getBridgeConfigFromType(type)

    return (
      <div
        className={twMerge(
          'group cursor-pointer rounded border border-[#ffffff33] text-white transition-colors',
          selected && 'border-[#5F7D5B]'
        )}
        onClick={() => setSelectedRoute(type)}
      >
        <div className="bg-gray-8 flex items-center rounded-t py-2 pl-4 pr-2 text-xs">
          <Image
            src={icon}
            width={width}
            height={height}
            alt="protocol"
            className="mr-1"
          />
          Powered by {name}
          {selected && (
            <Image
              src={'/icons/check.svg'}
              width={18}
              height={18}
              alt="selected"
              className="ml-auto"
            />
          )}
        </div>
        <div
          className={twMerge(
            'relative flex rounded-b bg-[#303030] px-4 py-3 text-sm transition-colors group-hover:bg-[#474747]',
            selected && 'bg-[#474747]'
          )}
        >
          <div className="flex flex-col">
            <span>You will receive:</span>
            <div className="flex flex-col text-lg">
              <div className="flex flex-row items-center gap-2">
                <TokenLogo
                  srcOverride={'logoURI' in token ? token.logoURI : ''}
                />
                {formatAmount(BigNumber.from(amountReceived), {
                  decimals: token.decimals,
                  symbol: token.symbol
                })}
              </div>
              {isBatchTransferSupported && (
                <div className="flew-row flex items-center gap-2">
                  <TokenLogo srcOverride={null} />
                  {formatAmount(BigNumber.from(amount2), {
                    decimals: 0,
                    symbol: childNativeCurrency.symbol
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="ml-6 flex flex-col justify-between gap-3">
            <div className="flex items-center">
              <Image
                src="/icons/duration.svg"
                width={15}
                height={15}
                alt="duration"
              />
              <span className="ml-1">
                {dayjs().add(durationMs, 'millisecond').fromNow(true)}
              </span>
            </div>
            <div className="flex items-center">
              <Image src="/icons/gas.svg" width={15} height={15} alt="gas" />
              <span className="ml-1">
                {isLoadingGasEstimate ? (
                  <Loader size="small" color="white" />
                ) : gasCost ? (
                  gasCost
                    .map(({ gasCost, gasToken }) =>
                      formatAmount(BigNumber.from(gasCost), {
                        decimals: gasToken.decimals,
                        symbol: gasToken.symbol
                      })
                    )
                    .join(' and ')
                ) : (
                  'N/A'
                )}
              </span>
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
          </div>
          {tag ? (
            <div className="absolute right-2 top-2">{getBadge(tag)()}</div>
          ) : null}
        </div>
      </div>
    )
  }
)

Route.displayName = 'Route'
