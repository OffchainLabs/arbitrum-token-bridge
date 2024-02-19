import { Chain, useAccount } from 'wagmi'
import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import { BigNumber, utils } from 'ethers'

import { getBridgeUiConfigForChain } from '../../../util/bridgeUiConfig'
import { getExplorerUrl } from '../../../util/networks'
import { shortenAddress } from '../../../util/CommonUtils'
import { ExternalLink } from '../../common/ExternalLink'
import { Loader } from '../../common/atoms/Loader'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { NativeCurrencyErc20 } from '../../../hooks/useNativeCurrency'
import { formatAmount } from '../../../util/NumberUtils'
import { TokenSymbolWithExplorerLink } from '../../common/TokenSymbolWithExplorerLink'
import { ether } from '../../../constants'
import { useDestinationAddressStore } from '../AdvancedSettings'
import { useBalances } from './hooks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useNetworks } from '../../../hooks/useNetworks'

export enum NetworkType {
  l1 = 'l1',
  l2 = 'l2'
}

function StyledLoader() {
  return <Loader color="white" size="small" />
}

function BalancesContainer({
  children,
  chainType
}: {
  chainType: 'source' | 'destination'
  children: React.ReactNode
}) {
  const { address: walletAddress } = useAccount()
  const { destinationAddress } = useDestinationAddressStore()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress
  const isAddressValid =
    destinationAddressOrWalletAddress &&
    utils.isAddress(destinationAddressOrWalletAddress)

  if (chainType === 'destination' && !isAddressValid) {
    return null
  }

  return (
    <div className="ml-1 flex flex-col flex-nowrap items-end break-all text-sm tracking-[.25px] text-white md:text-lg">
      <div className="flex justify-start gap-1">
        <span>Balance: </span>
        <div className="text-right">{children}</div>
      </div>
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

function ETHBalance({ chainType }: { chainType: 'source' | 'destination' }) {
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const { ethL1Balance, ethL2Balance } = useBalances()

  const balance = useMemo(() => {
    if (chainType === 'source') {
      if (isDepositMode) {
        return ethL1Balance
      }
      return ethL2Balance
    } else {
      // destination chain
      if (isDepositMode) {
        return ethL2Balance
      }
      return ethL1Balance
    }
  }, [chainType, ethL1Balance, ethL2Balance, isDepositMode])

  if (!balance) {
    return <StyledLoader />
  }

  return <span>{formatAmount(balance, { symbol: ether.symbol })}</span>
}
NetworkContainer.ETHBalance = ETHBalance

function CustomDestinationAddressBanner({ className }: { className: string }) {
  const [networks] = useNetworks()
  const { address } = useAccount()
  const { color } = getBridgeUiConfigForChain(networks.destinationChain.id)
  const { destinationAddress } = useDestinationAddressStore()
  const walletAddressLowercased = address?.toLowerCase()

  if (!destinationAddress || !walletAddressLowercased) {
    return null
  }

  if (destinationAddress === walletAddressLowercased) {
    return null
  }

  if (!utils.isAddress(destinationAddress)) {
    return null
  }

  return (
    <div
      style={{
        backgroundColor: `${color.primary}AA`,
        color: 'white',
        borderColor: color.primary
      }}
      className={twMerge(
        'w-full rounded-t border-b p-1 text-center text-sm',
        className
      )}
    >
      <span>
        Showing balance for Custom Destination Address:{' '}
        <ExternalLink
          className="arb-hover underline"
          href={`${getExplorerUrl(
            networks.destinationChain.id
          )}/address/${destinationAddress}`}
        >
          {shortenAddress(destinationAddress)}
        </ExternalLink>
      </span>
    </div>
  )
}

function NetworkContainer({
  network,
  children
}: {
  network: Chain
  children: React.ReactNode
}) {
  const {
    color,
    network: { logo: networkLogo }
  } = getBridgeUiConfigForChain(network.id)

  const backgroundImage = `url(${networkLogo})`

  return (
    <div
      style={{
        backgroundColor: `${color.primary}66`, // 255*40% is 102, = 66 in hex
        borderColor: color.primary
      }}
      className={twMerge(
        'relative rounded border transition-colors duration-400'
      )}
    >
      <CustomDestinationAddressBanner className="custom-address" />
      <div
        className="absolute left-0 top-0 z-0 h-full w-full bg-[length:auto_calc(100%_-_45px)] bg-[-2px_0] bg-no-repeat bg-origin-content p-2 opacity-50 [.custom-address~&]:bg-[-2px_40px]"
        style={{ backgroundImage }}
      />
      <div className="relative space-y-3.5 bg-contain bg-no-repeat p-3 sm:flex-row lg:p-2">
        {children}
      </div>
    </div>
  )
}

export { NetworkContainer }
