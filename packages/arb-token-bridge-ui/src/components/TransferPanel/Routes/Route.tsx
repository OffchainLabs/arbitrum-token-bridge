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
import { RouteType, SetRoute } from '../hooks/useRouteStore'
import { SecurityGuaranteed } from '../SecurityLabels'
import { TokenLogo } from '../TokenLogo'

export type BadgeType = 'security-guaranteed'
type Token = {
  address: string
  decimals: number
  symbol: string
  logoURI?: string
}
export type RouteProps = {
  type: RouteType
  amountReceived: string
  durationMs: number
  isLoadingGasEstimate: boolean
  /** Allow overrides of displayed token */
  overrideToken?: Token
  gasCost: string | undefined
  gasToken: Token
  bridge: string
  bridgeIconURI: string
  tag?: BadgeType
  selected: boolean
  onRouteSelected: SetRoute
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

export function Route({
  type,
  bridge,
  bridgeIconURI,
  durationMs,
  amountReceived,
  isLoadingGasEstimate,
  overrideToken,
  gasCost,
  gasToken,
  tag,
  onRouteSelected,
  selected
}: RouteProps) {
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const childNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })
  const [_token] = useSelectedToken()

  const token = overrideToken || _token || childNativeCurrency

  const { name, icon, width, height } = getBridgeConfigFromType(type)

  return (
    <div
      className={twMerge(
        'group cursor-pointer rounded border border-[#ffffff33] text-white transition-colors',
        selected && 'border-white'
      )}
      onClick={() => onRouteSelected(type)}
    >
      <div className="bg-gray-8 flex items-center rounded-t px-4 py-2 text-xs">
        <Image
          src={icon}
          width={width}
          height={height}
          alt="protocol"
          className="mr-1"
        />
        Powered by {name}
      </div>
      <div
        className={twMerge(
          'relative flex rounded-b bg-[#303030] px-4 py-3 text-sm transition-colors group-hover:bg-[#474747]',
          selected && 'bg-[#474747]'
        )}
      >
        <div className="flex flex-col">
          <span>You will receive:</span>
          <div className="flex items-center text-lg">
            <TokenLogo srcOverride={'logoURI' in token ? token.logoURI : ''} />
            {formatAmount(BigNumber.from(amountReceived), {
              decimals: token.decimals,
              symbol: token.symbol
            })}
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
                formatAmount(BigNumber.from(gasCost), {
                  decimals: gasToken.decimals,
                  symbol: gasToken.symbol
                })
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
