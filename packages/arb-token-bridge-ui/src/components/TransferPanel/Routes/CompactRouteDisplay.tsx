import Image from 'next/image'
import dayjs from 'dayjs'
import { SafeImage } from '../../common/SafeImage'
import { BigNumber, utils } from 'ethers'
import { twMerge } from 'tailwind-merge'
import { formatAmount, formatUSD } from '../../../util/NumberUtils'
import { Loader } from '../../common/atoms/Loader'
import { TokenLogo } from '../TokenLogo'
import React from 'react'
import { Tooltip } from '../../common/Tooltip'
import { ClockIcon } from '@heroicons/react/24/outline'
import { NativeCurrency } from '../../../hooks/useNativeCurrency'
import { RouteGas, RouteProps } from './Route'

export type Token = {
  address: string
  decimals: number
  symbol: string
  logoURI?: string
}

type CompactRouteDisplayProps = RouteProps & {
  token: Token | NativeCurrency
  showUsdValueForReceivedToken: boolean
  ethToUSD: (amount: number) => number
  gasEth?: RouteGas | false
  showUSDValueForBridgeFee: boolean | undefined
  isBatchTransferSupported: boolean
  amount2: string
  childNativeCurrency: NativeCurrency
}
export const CompactRouteDisplay = React.memo(
  ({
    type,
    bridgeIconURI,
    durationMs,
    amountReceived,
    isLoadingGasEstimate,
    gasCost,
    selected,
    bridgeFee,
    onSelectedRouteClick,
    token,
    showUsdValueForReceivedToken,
    ethToUSD,
    gasEth,
    showUSDValueForBridgeFee,
    isBatchTransferSupported,
    amount2,
    childNativeCurrency
  }: CompactRouteDisplayProps) => {
    return (
      <div
        className={twMerge(
          'group cursor-pointer rounded border border-[#ffffff33] text-white',
          selected && 'border-2 border-[#5F7D5B]'
        )}
        onClick={() => onSelectedRouteClick(type)}
        aria-label={`Route ${type}`}
      >
        {/* Main route content */}
        <div
          className={twMerge(
            'relative flex flex-col gap-3 rounded-t bg-[#303030] p-3 text-sm',
            selected && 'bg-[#5F7D5B60]'
          )}
        >
          {/* Main content - top row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <TokenLogo
                srcOverride={'logoURI' in token ? token.logoURI : null}
                className="-ml-[2px]"
              />
              <span className="text-base">
                {formatAmount(Number(amountReceived))} {token.symbol}
              </span>
              {showUsdValueForReceivedToken && (
                <span className="text-xs tabular-nums opacity-80">
                  ({formatUSD(ethToUSD(Number(amountReceived)))})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1">
              <SafeImage
                src={bridgeIconURI}
                width={12}
                height={12}
                alt="bridge"
                className="h-4 w-4 rounded-full"
              />

              <div className="h-[16px] border border-white/40" />

              <ClockIcon width={18} height={18} className="-ml-[1px]" />
              <span className="text-xs">
                {dayjs().add(durationMs, 'millisecond').fromNow(true)}
              </span>
            </div>
          </div>

          {/* Secondary content - 2nd row */}
          <div className="flex items-center gap-4">
            <Tooltip content={'The gas fees paid to operate the network'}>
              <div className="flex items-center">
                <Image src="/icons/gas.svg" width={12} height={12} alt="gas" />
                <span className="ml-1" aria-label="Route gas">
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
                        <span className="text-xs tabular-nums opacity-80">
                          (
                          {formatUSD(
                            ethToUSD(
                              Number(
                                utils.formatEther(
                                  BigNumber.from(gasEth.gasCost)
                                )
                              )
                            )
                          )}
                          )
                        </span>
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
                    width={12}
                    height={12}
                    alt="bridge fee"
                  />
                  <span>
                    {formatAmount(BigNumber.from(bridgeFee.fee), {
                      decimals: bridgeFee.token.decimals,
                      symbol: bridgeFee.token.symbol
                    })}
                  </span>
                  {showUSDValueForBridgeFee && (
                    <span className="text-xs tabular-nums opacity-80">
                      (
                      {formatUSD(
                        ethToUSD(
                          Number(
                            utils.formatEther(BigNumber.from(bridgeFee.fee))
                          )
                        )
                      )}
                      )
                    </span>
                  )}
                </div>
              </Tooltip>
            )}

            {isBatchTransferSupported && Number(amount2) > 0 && (
              <div className="flex items-center gap-1">
                <TokenLogo srcOverride={null} />
                <span>
                  {formatAmount(Number(amount2), {
                    symbol: childNativeCurrency.symbol
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)

CompactRouteDisplay.displayName = 'CompactRouteDisplay'
