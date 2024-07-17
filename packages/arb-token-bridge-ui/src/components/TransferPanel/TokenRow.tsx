import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { Chain } from 'wagmi'

import { Loader } from '../common/atoms/Loader'
import { useAppState } from '../../state'
import {
  listIdsToNames,
  SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID
} from '../../util/TokenListUtils'
import { formatAmount } from '../../util/NumberUtils'
import { shortenAddress } from '../../util/CommonUtils'
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  sanitizeTokenName,
  sanitizeTokenSymbol
} from '../../util/TokenUtils'
import { SafeImage } from '../common/SafeImage'
import { getExplorerUrl, getNetworkName } from '../../util/networks'
import { Tooltip } from '../common/Tooltip'
import { StatusBadge } from '../common/StatusBadge'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { ExternalLink } from '../common/ExternalLink'
import { useAccountType } from '../../hooks/useAccountType'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { TokenLogoFallback } from './TokenInfo'
import { useBalanceOnSourceChain } from '../../hooks/useBalanceOnSourceChain'

function tokenListIdsToNames(ids: number[]): string {
  return ids
    .map((tokenListId: number) => listIdsToNames[tokenListId])
    .join(', ')
}

function StyledLoader() {
  return (
    <div className="mr-2">
      <Loader color="white" size="small" />
    </div>
  )
}

function BlockExplorerTokenLink({
  chain,
  address
}: {
  chain: Chain
  address: string | undefined
}) {
  if (typeof address === 'undefined') {
    return null
  }

  return (
    <ExternalLink
      href={`${getExplorerUrl(chain.id)}/token/${address}`}
      className="arb-hover text-xs underline"
      onClick={e => e.stopPropagation()}
    >
      {shortenAddress(address).toLowerCase()}
    </ExternalLink>
  )
}

function TokenListInfo({ token }: { token: ERC20BridgeToken | null }) {
  const [networks] = useNetworks()
  const { childChain, childChainProvider } = useNetworksRelationship(networks)
  const { isCustom: childChainNativeCurrencyIsCustom } = useNativeCurrency({
    provider: childChainProvider
  })

  const tokenListInfo = useMemo(() => {
    if (!token) {
      return null
    }

    if (isTokenArbitrumOneNativeUSDC(token?.address)) {
      return 'Native USDC on Arbitrum One'
    }

    if (isTokenArbitrumSepoliaNativeUSDC(token?.address)) {
      return 'Native USDC on Arbitrum Sepolia'
    }

    const listIds: Set<number> = token.listIds
    const listIdsSize = listIds.size
    if (listIdsSize === 0) {
      return 'Added by User'
    }

    const listIdsArray = Array.from(listIds)
    if (listIdsSize < 2) {
      return tokenListIdsToNames(listIdsArray)
    }

    const firstList = listIdsArray.slice(0, 1)
    const more = listIdsSize - 1

    return (
      tokenListIdsToNames(firstList) +
      ` and ${more} more list${more > 1 ? 's' : ''}`
    )
  }, [token])

  if (!token) {
    const nativeTokenChain = getNetworkName(
      (childChainNativeCurrencyIsCustom ? childChain : networks.sourceChain).id
    )
    return (
      <span className="flex text-xs text-white/70">
        Native token on {nativeTokenChain}
      </span>
    )
  }

  if (token?.isL2Native) {
    return (
      <span className="flex text-xs text-white/70">
        {`This token is native to ${getNetworkName(
          childChain.id
        )} and can’t be bridged.`}
      </span>
    )
  }

  return <span className="flex text-xs text-white/70">{tokenListInfo}</span>
}

interface TokenRowProps {
  style?: React.CSSProperties
  onTokenSelected: (token: ERC20BridgeToken | null) => void
  token: ERC20BridgeToken | null
}

function useTokenInfo(token: ERC20BridgeToken | null) {
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, isDepositMode } =
    useNetworksRelationship(networks)
  const chainId = isDepositMode ? parentChain.id : childChain.id
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const name = useMemo(() => {
    if (token) {
      return sanitizeTokenName(token.name, {
        erc20L1Address: token.address,
        chainId
      })
    }

    return nativeCurrency.name
  }, [token, nativeCurrency.name, chainId])

  const symbol = useMemo(() => {
    if (token) {
      return sanitizeTokenSymbol(token.symbol, {
        erc20L1Address: token.address,
        chainId
      })
    }

    return nativeCurrency.symbol
  }, [token, nativeCurrency.symbol, chainId])

  const logoURI = useMemo(() => {
    if (!token) {
      return nativeCurrency.logoUrl
    }

    return token.logoURI
  }, [token, nativeCurrency])

  const balance = useBalanceOnSourceChain(token)

  const isArbitrumToken = useMemo(() => {
    if (!token) {
      return false
    }

    return token.listIds.has(SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID)
  }, [token])

  const isPotentialFakeArbitrumToken = useMemo(() => {
    if (!token || isArbitrumToken) {
      return false
    }

    return (
      token.name.toLowerCase().startsWith('arb') ||
      token.symbol.toLowerCase().startsWith('arb')
    )
  }, [token, isArbitrumToken])

  const isBridgeable = useMemo(() => {
    if (!token) {
      return true
    }

    if (token?.isL2Native) {
      return false
    }

    if (isDepositMode) {
      return true
    }

    return typeof token?.l2Address !== 'undefined'
  }, [isDepositMode, token])

  return {
    name,
    symbol,
    logoURI,
    balance,
    isArbitrumToken,
    isPotentialFakeArbitrumToken,
    isBridgeable
  }
}

function ArbitrumTokenBadge() {
  return (
    <StatusBadge variant="green" className="text-xs leading-extra-tight">
      <CheckCircleIcon className="h-3 w-3" />
      <p>
        <span>Official</span>
        <span className="hidden lg:inline"> ARB token</span>
      </p>
    </StatusBadge>
  )
}

function TokenBalance({ token }: { token: ERC20BridgeToken | null }) {
  const {
    app: {
      arbTokenBridge: { bridgeTokens }
    }
  } = useAppState()
  const { isLoading: isLoadingAccountType } = useAccountType()
  const { balance, symbol } = useTokenInfo(token)

  const isArbitrumNativeUSDC =
    isTokenArbitrumOneNativeUSDC(token?.address) ||
    isTokenArbitrumSepoliaNativeUSDC(token?.address)

  const tokenIsAddedToTheBridge = useMemo(() => {
    // Can happen when switching networks.
    if (typeof bridgeTokens === 'undefined') {
      return true
    }

    if (!token) {
      return true
    }

    if (isArbitrumNativeUSDC) {
      return true
    }

    return typeof bridgeTokens[token.address] !== 'undefined'
  }, [bridgeTokens, isArbitrumNativeUSDC, token])

  if (!tokenIsAddedToTheBridge) {
    return <span className="arb-hover text-sm">Import</span>
  }

  // We don't want users to be able to click on USDC before we know whether or not they are SCW users
  if (isLoadingAccountType && isArbitrumNativeUSDC) {
    return <StyledLoader />
  }

  return (
    <span className="flex items-center whitespace-nowrap text-sm text-white/70">
      {balance ? (
        formatAmount(balance, {
          decimals: token?.decimals,
          symbol
        })
      ) : (
        <StyledLoader />
      )}
    </span>
  )
}

function TokenContractLink({ token }: { token: ERC20BridgeToken | null }) {
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, isDepositMode } =
    useNetworksRelationship(networks)

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const isCustomFeeTokenRow = token === null && nativeCurrency.isCustom

  if (isCustomFeeTokenRow && isDepositMode) {
    return (
      <BlockExplorerTokenLink
        chain={parentChain}
        address={nativeCurrency.address}
      />
    )
  }

  if (!token) {
    return null
  }

  if (isDepositMode) {
    return token?.isL2Native ? (
      <BlockExplorerTokenLink chain={childChain} address={token.address} />
    ) : (
      <BlockExplorerTokenLink chain={parentChain} address={token.address} />
    )
  }

  if (typeof token.l2Address !== 'undefined') {
    return (
      <BlockExplorerTokenLink chain={childChain} address={token.l2Address} />
    )
  }
  return (
    <span className="text-xs text-white/70">
      This token hasn&apos;t been bridged to {getNetworkName(childChain.id)}.
    </span>
  )
}

export function TokenRow({
  style,
  onTokenSelected,
  token
}: TokenRowProps): JSX.Element {
  const {
    name: tokenName,
    symbol: tokenSymbol,
    logoURI: tokenLogoURI,
    isArbitrumToken,
    isPotentialFakeArbitrumToken,
    isBridgeable: tokenIsBridgeable
  } = useTokenInfo(token)

  return (
    <button
      type="button"
      onClick={() => onTokenSelected(token)}
      style={{ ...style, minHeight: '84px' }}
      disabled={!tokenIsBridgeable}
      className={twMerge(
        'flex w-full flex-row items-center justify-between px-4 py-3 transition duration-200 hover:bg-white/10',
        tokenIsBridgeable
          ? 'cursor-pointer opacity-100'
          : 'cursor-not-allowed opacity-50'
      )}
    >
      <div className="flex w-full flex-row items-center justify-start space-x-4">
        <SafeImage
          src={tokenLogoURI}
          alt={`${tokenName} logo`}
          className="h-6 w-6 shrink-0"
          fallback={<TokenLogoFallback />}
        />

        <div className="flex w-full flex-col items-start gap-1 truncate">
          <div className="flex w-full items-center gap-1">
            <span className="text-base font-medium leading-none">
              {tokenSymbol}
            </span>
            <span className="text-xs text-white/70">{tokenName}</span>
            {isArbitrumToken && <ArbitrumTokenBadge />}
            {isPotentialFakeArbitrumToken && (
              <Tooltip content="This token is different from the official Arbitrum token (ARB).">
                <div className="box-border flex w-max flex-nowrap items-center gap-1 rounded-full border-[1px] border-gray-dark px-1 py-[2px] pr-2 text-sm">
                  <ExclamationCircleIcon className="h-3 w-3 text-gray-dark" />
                  <span className="text-xs text-gray-dark">Careful</span>
                </div>
              </Tooltip>
            )}
          </div>
          <TokenContractLink token={token} />
          <TokenListInfo token={token} />
        </div>
        {tokenIsBridgeable && <TokenBalance token={token} />}
      </div>
    </button>
  )
}
