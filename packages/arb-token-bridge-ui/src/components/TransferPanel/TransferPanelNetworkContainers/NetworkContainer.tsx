import { Chain, useAccount } from 'wagmi'
import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import { BigNumber, utils } from 'ethers'

import { getBridgeUiConfigForChain } from '../../../util/bridgeUiConfig'
import { getExplorerUrl, isNetwork } from '../../../util/networks'
import { shortenAddress } from '../../../util/CommonUtils'
import { ExternalLink } from '../../common/ExternalLink'
import { Loader } from '../../common/atoms/Loader'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { NativeCurrencyErc20 } from '../../../hooks/useNativeCurrency'
import { formatAmount } from '../../../util/NumberUtils'
import { TokenSymbolWithExplorerLink } from '../../common/TokenSymbolWithExplorerLink'
import { ether } from '../../../constants'

export enum NetworkType {
  l1 = 'l1',
  l2 = 'l2'
}

function StyledLoader() {
  return <Loader color="white" size="small" />
}

function BalancesContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-1 flex flex-col flex-nowrap items-end break-all text-sm tracking-[.25px] text-white md:text-lg">
      {children}
    </div>
  )
}
NetworkContainer.BalancesContainer = BalancesContainer

function NetworkListboxPlusBalancesContainer({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-1 gap-y-2.5 whitespace-nowrap sm:flex-row sm:items-center">
      {children}
    </div>
  )
}
NetworkContainer.NetworkListboxPlusBalancesContainer =
  NetworkListboxPlusBalancesContainer

function TokenBalance({
  forToken,
  balance,
  on,
  prefix = '',
  tokenSymbolOverride
}: {
  forToken: ERC20BridgeToken | NativeCurrencyErc20 | null
  balance: BigNumber | null
  on: NetworkType
  prefix?: string
  tokenSymbolOverride?: string
}) {
  const isParentChain = on === NetworkType.l1

  if (!forToken) {
    return null
  }

  if (!balance) {
    return <StyledLoader />
  }

  return (
    <p aria-label={`${forToken.symbol} balance on ${on}`}>
      <span className="font-light">{prefix}</span>
      <span>
        {formatAmount(balance, {
          decimals: forToken.decimals
        })}
      </span>{' '}
      <TokenSymbolWithExplorerLink
        token={forToken}
        tokenSymbolOverride={tokenSymbolOverride}
        isParentChain={isParentChain}
      />
    </p>
  )
}
NetworkContainer.TokenBalance = TokenBalance

function ETHBalance({
  balance,
  prefix = ''
}: {
  balance: BigNumber | null
  prefix?: string
}) {
  if (!balance) {
    return <StyledLoader />
  }

  return (
    <p>
      <span className="font-light">{prefix}</span>
      <span>{formatAmount(balance, { symbol: ether.symbol })}</span>
    </p>
  )
}
NetworkContainer.ETHBalance = ETHBalance

function CustomAddressBanner({
  network,
  customAddress
}: {
  network: Chain
  customAddress: string | undefined
}) {
  const { isArbitrum, isArbitrumNova, isOrbitChain } = isNetwork(network.id)
  const { color } = getBridgeUiConfigForChain(network.id)

  const backgroundColorForL1OrL2Chain = useMemo(() => {
    if (isOrbitChain) {
      return ''
    }
    if (!isArbitrum) {
      return 'bg-cyan'
    }
    if (isArbitrumNova) {
      return 'bg-orange'
    }
    return 'bg-cyan'
  }, [isArbitrum, isArbitrumNova, isOrbitChain])

  if (!customAddress) {
    return null
  }

  return (
    <div
      style={{
        backgroundColor: isOrbitChain
          ? // add opacity to create a lighter shade
            `${color.primary}20`
          : undefined,
        color: color.secondary,
        borderColor: color.secondary
      }}
      className={twMerge(
        'w-full rounded-t-lg border-4 p-1 text-center text-sm',
        !isOrbitChain && backgroundColorForL1OrL2Chain
      )}
    >
      <span>
        Showing balance for Custom Destination Address:{' '}
        <ExternalLink
          className="arb-hover underline"
          href={`${getExplorerUrl(network.id)}/address/${customAddress}`}
        >
          {shortenAddress(customAddress)}
        </ExternalLink>
      </span>
    </div>
  )
}

function NetworkContainer({
  network,
  customAddress,
  children
}: {
  network: Chain
  customAddress?: string
  children: React.ReactNode
}) {
  const { address } = useAccount()
  const {
    color,
    network: { logo: networkLogo }
  } = getBridgeUiConfigForChain(network.id)

  const backgroundImage = `url(${networkLogo})`

  const walletAddressLowercased = address?.toLowerCase()

  const showCustomAddressBanner = useMemo(() => {
    if (!customAddress || !walletAddressLowercased) {
      return false
    }
    if (customAddress === walletAddressLowercased) {
      return false
    }
    return utils.isAddress(customAddress)
  }, [customAddress, walletAddressLowercased])

  return (
    <>
      {showCustomAddressBanner && (
        <CustomAddressBanner network={network} customAddress={customAddress} />
      )}
      <div
        style={{
          backgroundColor: `${color.primary}66`, // 255*40% is 102, = 66 in hex
          borderColor: color.primary
        }}
        className={twMerge(
          'relative rounded border p-1 transition-colors duration-400',
          showCustomAddressBanner && 'rounded-t-none'
        )}
      >
        <div
          className="absolute left-0 top-0 z-0 h-full w-full bg-[length:auto_calc(100%_-_45px)] bg-[-2px_0] bg-no-repeat bg-origin-content p-2 opacity-50"
          style={{ backgroundImage }}
        />
        <div className="relative space-y-3.5 bg-contain bg-no-repeat p-3 sm:flex-row lg:p-2">
          {children}
        </div>
      </div>
    </>
  )
}

export { NetworkContainer }
