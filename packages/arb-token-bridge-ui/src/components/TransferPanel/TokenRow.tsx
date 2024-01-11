import { useMemo } from 'react'
import { useMedia } from 'react-use'
import { twMerge } from 'tailwind-merge'
import {
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { constants } from 'ethers'
import { Chain, useAccount } from 'wagmi'

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
  isTokenArbitrumGoerliNativeUSDC,
  sanitizeTokenName,
  sanitizeTokenSymbol
} from '../../util/TokenUtils'
import { SafeImage } from '../common/SafeImage'
import { getExplorerUrl, getNetworkName } from '../../util/networks'
import { Tooltip } from '../common/Tooltip'
import { StatusBadge } from '../common/StatusBadge'
import { useBalance } from '../../hooks/useBalance'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { ExternalLink } from '../common/ExternalLink'
import { useAccountType } from '../../hooks/useAccountType'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

function tokenListIdsToNames(ids: number[]): string {
  return ids
    .map((tokenListId: number) => listIdsToNames[tokenListId])
    .join(', ')
}

function TokenLogoFallback() {
  return (
    <div className="flex h-8 w-8 min-w-[2rem] items-center justify-center rounded-full bg-ocl-blue text-sm font-medium text-white">
      ?
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
      className="text-xs text-blue-link underline"
      onClick={e => e.stopPropagation()}
    >
      {shortenAddress(address).toLowerCase()}
    </ExternalLink>
  )
}

interface TokenRowProps {
  style?: React.CSSProperties
  onClick: React.MouseEventHandler<HTMLButtonElement>
  token: ERC20BridgeToken | null
}

export function TokenRow({
  style,
  onClick,
  token
}: TokenRowProps): JSX.Element {
  const { address: walletAddress } = useAccount()
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
      isDepositMode
    }
  } = useAppState()
  const { isLoading: isLoadingAccountType } = useAccountType()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks)

  const chainId = isDepositMode ? parentChain.id : childChain.id
  const isSmallScreen = useMedia('(max-width: 419px)')
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const tokenName = useMemo(() => {
    if (token) {
      return sanitizeTokenName(token.name, {
        erc20L1Address: token.address,
        chainId
      })
    }

    return nativeCurrency.name
  }, [token, nativeCurrency.name, chainId])

  const tokenSymbol = useMemo(() => {
    if (token) {
      return sanitizeTokenSymbol(token.symbol, {
        erc20L1Address: token.address,
        chainId
      })
    }

    return nativeCurrency.symbol
  }, [token, nativeCurrency.symbol, chainId])

  const isL2NativeToken = useMemo(() => token?.isL2Native ?? false, [token])
  const tokenIsArbOneNativeUSDC = useMemo(
    () => isTokenArbitrumOneNativeUSDC(token?.address),
    [token]
  )
  const tokenIsArbGoerliNativeUSDC = useMemo(
    () => isTokenArbitrumGoerliNativeUSDC(token?.address),
    [token]
  )

  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({
    provider: parentChainProvider,
    walletAddress
  })
  const {
    eth: [nativeL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({
    provider: childChainProvider,
    walletAddress
  })

  const tokenLogoURI = useMemo(() => {
    if (!token) {
      return nativeCurrency.logoUrl
    }

    return token.logoURI
  }, [token, nativeCurrency])

  const tokenBalance = useMemo(() => {
    if (!token) {
      if (nativeCurrency.isCustom) {
        return isDepositMode
          ? erc20L1Balances?.[nativeCurrency.address]
          : nativeL2Balance
      }

      return isDepositMode ? ethL1Balance : nativeL2Balance
    }

    if (isDepositMode) {
      return erc20L1Balances?.[token.address.toLowerCase()]
    }

    if (!token.l2Address) {
      return constants.Zero
    }

    return erc20L2Balances?.[token.l2Address.toLowerCase()] ?? constants.Zero
  }, [
    erc20L1Balances,
    erc20L2Balances,
    ethL1Balance,
    isDepositMode,
    nativeCurrency,
    nativeL2Balance,
    token
  ])

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

  const tokenListInfo = useMemo(() => {
    if (!token) {
      return null
    }

    if (tokenIsArbOneNativeUSDC) {
      return 'Native USDC on Arbitrum One'
    }

    if (tokenIsArbGoerliNativeUSDC) {
      return 'Native USDC on Arbitrum Goerli'
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
  }, [token, tokenIsArbGoerliNativeUSDC, tokenIsArbOneNativeUSDC])

  const tokenIsAddedToTheBridge = useMemo(() => {
    // Can happen when switching networks.
    if (typeof bridgeTokens === 'undefined') {
      return true
    }

    if (!token) {
      return true
    }

    if (tokenIsArbOneNativeUSDC || tokenIsArbGoerliNativeUSDC) {
      return true
    }

    return typeof bridgeTokens[token.address] !== 'undefined'
  }, [bridgeTokens, token, tokenIsArbOneNativeUSDC, tokenIsArbGoerliNativeUSDC])

  const tokenHasL2Address = useMemo(() => {
    if (!token) {
      return true
    }

    return typeof token.l2Address !== 'undefined'
  }, [token])

  const tokenIsBridgeable = useMemo(() => {
    if (isL2NativeToken) {
      return false
    }

    if (isDepositMode) {
      return true
    }

    return tokenHasL2Address
  }, [isDepositMode, tokenHasL2Address, isL2NativeToken])

  const isCustomFeeTokenRow = token === null && nativeCurrency.isCustom

  const arbitrumTokenTooltipContent = useMemo(() => {
    const networkName = getNetworkName(
      isDepositMode ? parentChain.id : childChain.id
    )

    return (
      <span>
        This is the official Arbitrum token on {networkName}. Please beware of
        fake tokens trying to impersonate it.
      </span>
    )
  }, [childChain.id, isDepositMode, parentChain.id])

  const tokenBalanceContent = useMemo(() => {
    if (!tokenIsAddedToTheBridge) {
      return <span className="text-sm font-medium text-blue-link">Import</span>
    }

    // We don't want users to be able to click on USDC before we know whether or not they are SCW users
    if (
      isLoadingAccountType &&
      (tokenIsArbGoerliNativeUSDC || tokenIsArbOneNativeUSDC)
    ) {
      return (
        <div className="mr-2">
          <Loader color="#28A0F0" size="small" />
        </div>
      )
    }

    return (
      <span className="flex items-center whitespace-nowrap text-sm text-gray-500">
        {tokenBalance ? (
          formatAmount(tokenBalance, {
            decimals: token?.decimals,
            symbol: tokenSymbol
          })
        ) : (
          <div className="mr-2">
            <Loader color="#28A0F0" size="small" />
          </div>
        )}
      </span>
    )
  }, [
    isLoadingAccountType,
    token?.decimals,
    tokenBalance,
    tokenIsAddedToTheBridge,
    tokenIsArbGoerliNativeUSDC,
    tokenIsArbOneNativeUSDC,
    tokenSymbol
  ])

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...style, minHeight: '84px' }}
      disabled={!tokenIsBridgeable}
      className={twMerge(
        'flex w-full flex-row items-center justify-between bg-white px-4 py-3 hover:bg-gray-100',
        tokenIsBridgeable
          ? 'cursor-pointer opacity-100'
          : 'cursor-not-allowed opacity-50'
      )}
    >
      <div className="flex w-full flex-row items-center justify-start space-x-4">
        <SafeImage
          src={tokenLogoURI}
          alt={`${tokenName} logo`}
          className="h-8 w-8 grow-0"
          fallback={<TokenLogoFallback />}
        />

        <div className="flex w-full flex-col items-start truncate">
          <div className="flex w-full items-center space-x-2">
            <span className="text-base font-medium text-gray-900">
              {tokenSymbol}
            </span>
            <span className="text-xs text-gray-500">{tokenName}</span>

            {isArbitrumToken && (
              <Tooltip content={arbitrumTokenTooltipContent}>
                <StatusBadge variant="green">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="text-xs">
                    Official{isSmallScreen ? '' : ' ARB token'}
                  </span>
                </StatusBadge>
              </Tooltip>
            )}

            {!token && (
              <div className="flex w-full justify-end">
                {tokenBalanceContent}
              </div>
            )}

            {isPotentialFakeArbitrumToken && (
              <Tooltip content="This token is different from the official Arbitrum token (ARB).">
                <div className="box-border flex w-max flex-nowrap items-center gap-1 rounded-full border-[1px] border-gray-dark px-1 py-[2px] pr-2 text-sm">
                  <ExclamationCircleIcon className="h-4 w-4 text-gray-dark" />
                  <span className="text-xs text-gray-dark">Careful</span>
                </div>
              </Tooltip>
            )}
          </div>

          {token && (
            <div className="flex w-full flex-col items-start space-y-1">
              {/* TODO: anchor shouldn't be nested within a button */}
              <div className="flex w-full justify-between">
                {isDepositMode ? (
                  <>
                    {isL2NativeToken ? (
                      <BlockExplorerTokenLink
                        chain={childChain}
                        address={token.address}
                      />
                    ) : (
                      <BlockExplorerTokenLink
                        chain={parentChain}
                        address={token.address}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {tokenHasL2Address ? (
                      <BlockExplorerTokenLink
                        chain={childChain}
                        address={token.l2Address}
                      />
                    ) : (
                      <span className="text-xs text-gray-900">
                        This token hasn&apos;t been bridged to{' '}
                        {getNetworkName(childChain.id)}.
                      </span>
                    )}
                  </>
                )}
                {tokenIsBridgeable && tokenBalanceContent}
              </div>
              {isL2NativeToken ? (
                <span className="flex gap-1 text-xs font-normal">
                  {`This token is native to ${getNetworkName(
                    childChain.id
                  )} and can’t be bridged.`}
                </span>
              ) : (
                <span className="flex gap-1 whitespace-normal text-left text-xs font-normal text-gray-500">
                  {tokenListInfo}
                </span>
              )}
            </div>
          )}

          {isCustomFeeTokenRow && (
            <div className="flex w-full flex-col items-start space-y-1">
              <div className="flex w-full justify-between">
                {isDepositMode && (
                  <BlockExplorerTokenLink
                    chain={parentChain}
                    address={nativeCurrency.address}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
