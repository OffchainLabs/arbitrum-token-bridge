import React, { FormEventHandler, useMemo, useState, useCallback } from 'react'
import { isAddress } from 'ethers/lib/utils'
import { AutoSizer, List } from 'react-virtualized'
import {
  CheckCircleIcon,
  XIcon,
  ArrowSmLeftIcon,
  ExclamationCircleIcon
} from '@heroicons/react/outline'
import { useMedia } from 'react-use'
import { constants } from 'ethers'
import { useBalance, getL1TokenData, ERC20BridgeToken } from 'token-bridge-sdk'
import Image from 'next/image'

import { Loader } from '../common/atoms/Loader'
import { useActions, useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  BridgeTokenList,
  listIdsToNames,
  addBridgeTokenListToBridge,
  useTokenLists,
  SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID
} from '../../tokenLists'
import { formatAmount } from '../../util/NumberUtils'
import { shortenAddress } from '../../util/CommonUtils'
import { Button } from '../common/Button'
import { SafeImage } from '../common/SafeImage'
import {
  useTokensFromLists,
  useTokensFromUser,
  toERC20BridgeToken
} from './TokenSearchUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getExplorerUrl, getNetworkName } from '../../util/networks'
import { Tooltip } from '../common/Tooltip'
import { StatusBadge } from '../common/StatusBadge'

enum Panel {
  TOKENS,
  LISTS
}

function tokenListIdsToNames(ids: number[]): string {
  return ids
    .map((tokenListId: number) => listIdsToNames[tokenListId])
    .join(', ')
}

function TokenLogoFallback() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-arbitrum text-sm font-medium text-white">
      ?
    </div>
  )
}

interface TokenRowProps {
  style?: React.CSSProperties
  onClick: React.MouseEventHandler<HTMLButtonElement>
  token: ERC20BridgeToken | null
}

function TokenRow({ style, onClick, token }: TokenRowProps): JSX.Element {
  const {
    app: {
      arbTokenBridge: { bridgeTokens, walletAddress },
      isDepositMode
    }
  } = useAppState()
  const {
    l1: { network: l1Network, provider: l1Provider },
    l2: { network: l2Network, provider: l2Provider }
  } = useNetworksAndSigners()

  const tokenName = useMemo(() => (token ? token.name : 'Ether'), [token])
  const tokenSymbol = useMemo(() => (token ? token.symbol : 'ETH'), [token])

  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({ provider: l1Provider, walletAddress })
  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({ provider: l2Provider, walletAddress })

  const tokenLogoURI = useMemo(() => {
    if (!token) {
      return 'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png'
    }

    if (!token.logoURI) {
      return undefined
    }

    return token.logoURI
  }, [token])

  const tokenBalance = useMemo(() => {
    if (!token) {
      return isDepositMode ? ethL1Balance : ethL2Balance
    }

    if (isDepositMode) {
      return erc20L1Balances?.[token.address.toLowerCase()]
    }

    if (!token.l2Address) {
      return constants.Zero
    }

    return erc20L2Balances?.[token.l2Address.toLowerCase()] ?? constants.Zero
  }, [
    ethL1Balance,
    ethL2Balance,
    token,
    isDepositMode,
    erc20L1Balances,
    erc20L2Balances
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

  const tokenIsAddedToTheBridge = useMemo(() => {
    // Can happen when switching networks.
    if (typeof bridgeTokens === 'undefined') {
      return true
    }

    if (!token) {
      return true
    }

    return typeof bridgeTokens[token.address] !== 'undefined'
  }, [token, bridgeTokens])

  const tokenHasL2Address = useMemo(() => {
    if (!token) {
      return true
    }

    return typeof token.l2Address !== 'undefined'
  }, [token])

  const tokenIsBridgeable = useMemo(() => {
    if (isDepositMode) {
      return true
    }

    return tokenHasL2Address
  }, [isDepositMode, tokenHasL2Address])

  const arbitrumTokenTooltipContent = useMemo(() => {
    const networkName = getNetworkName(
      isDepositMode ? l1Network.chainID : l2Network.chainID
    )

    return (
      <span>
        This is the official Arbitrum token on {networkName}. Please beware of
        fake tokens trying to impersonate it.
      </span>
    )
  }, [isDepositMode, l1Network, l2Network])

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...style, minHeight: '84px' }}
      disabled={!tokenIsBridgeable}
      className="flex w-full flex-row items-center justify-between bg-white px-4 py-3 hover:bg-gray-100"
    >
      <div className="flex w-full flex-row items-center justify-start space-x-4">
        <SafeImage
          src={tokenLogoURI}
          alt={`${tokenName} logo`}
          className="h-8 w-8 grow-0 rounded-full"
          fallback={<TokenLogoFallback />}
        />

        <div className="flex flex-col items-start truncate">
          <div className="flex items-center space-x-2">
            <span className="text-base font-medium text-gray-900">
              {tokenSymbol}
            </span>
            <span className="text-xs text-gray-500">{tokenName}</span>

            {isArbitrumToken && (
              <Tooltip content={arbitrumTokenTooltipContent}>
                <StatusBadge variant="green">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="text-xs">Official ARB token</span>
                </StatusBadge>
              </Tooltip>
            )}

            {isPotentialFakeArbitrumToken && (
              <Tooltip content="This token is different from the official Arbitrum token (ARB).">
                <div className="box-border flex w-max flex-nowrap items-center gap-1 rounded-full border-[1px] border-gray-10 px-1 py-[2px] pr-2 text-sm">
                  <ExclamationCircleIcon className="h-4 w-4 text-gray-10" />
                  <span className="text-xs text-gray-10">Careful</span>
                </div>
              </Tooltip>
            )}
          </div>
          {token && (
            <div className="flex flex-col items-start space-y-1">
              {/* TODO: anchor shouldn't be nested within a button */}
              {isDepositMode ? (
                <a
                  href={`${getExplorerUrl(l1Network.chainID)}/token/${
                    token.address
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-link underline"
                  onClick={e => e.stopPropagation()}
                >
                  {shortenAddress(token.address).toLowerCase()}
                </a>
              ) : (
                <>
                  {tokenHasL2Address ? (
                    <a
                      href={`${getExplorerUrl(l2Network.chainID)}/token/${
                        token.l2Address
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-link underline"
                      onClick={e => e.stopPropagation()}
                    >
                      {token.l2Address
                        ? shortenAddress(token.l2Address).toLowerCase()
                        : ''}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-900">
                      This token hasn&apos;t been bridged to L2
                    </span>
                  )}
                </>
              )}
              <span className="text-xs font-normal text-gray-500">
                {tokenListInfo}
              </span>
            </div>
          )}
        </div>
      </div>

      {tokenIsBridgeable && (
        <>
          {tokenIsAddedToTheBridge ? (
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
          ) : (
            <span className="text-sm font-medium text-blue-link">Import</span>
          )}
        </>
      )}
    </button>
  )
}

function TokenListsPanel() {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const { bridgeTokens, token } = arbTokenBridge

  const listsToShow: BridgeTokenList[] = useMemo(() => {
    if (typeof l2Network === 'undefined') {
      return []
    }

    return BRIDGE_TOKEN_LISTS.filter(tokenList => {
      // Don't show the Arbitrum Token token list, because it's special and can't be disabled
      if (tokenList.isArbitrumTokenTokenList) {
        return false
      }

      return tokenList.originChainID === l2Network.chainID
    })
  }, [l2Network])

  const toggleTokenList = (
    bridgeTokenList: BridgeTokenList,
    isActive: boolean
  ) => {
    if (isActive) {
      token.removeTokensFromList(bridgeTokenList.id)
    } else {
      addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
    }
  }

  // Can happen when switching networks.
  if (typeof bridgeTokens === 'undefined') {
    return null
  }

  return (
    <div className="flex flex-col gap-6 rounded-md border border-gray-300 p-6">
      {listsToShow.map(tokenList => {
        const isActive = Object.keys(bridgeTokens).some(address => {
          const token = bridgeTokens[address]
          return token?.listIds.has(tokenList?.id)
        })

        return (
          <label
            key={tokenList.id}
            className="flex items-center justify-start space-x-3"
          >
            <div className="switch">
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => toggleTokenList(tokenList, isActive)}
              />
              <span className="slider round"></span>
            </div>
            <div className="flex items-center space-x-1">
              <Image
                src={tokenList.logoURI}
                alt={`${tokenList.name} Logo`}
                className="h-6 w-6 rounded-full"
                width={24}
                height={24}
              />
              <span className="text-sm text-gray-900">{tokenList.name}</span>
            </div>
          </label>
        )
      })}
    </div>
  )
}

const ETH_IDENTIFIER = 'eth.address'

function TokensPanel({
  onTokenSelected
}: {
  onTokenSelected: (token: ERC20BridgeToken | null) => void
}): JSX.Element {
  const {
    app: {
      arbTokenBridge: { token, walletAddress, bridgeTokens },
      isDepositMode
    }
  } = useAppState()
  const {
    l1: { provider: L1Provider },
    l2: { provider: L2Provider }
  } = useNetworksAndSigners()
  const isLarge = useMedia('(min-width: 1024px)')
  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({ provider: L1Provider, walletAddress })
  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({ provider: L2Provider, walletAddress })

  const tokensFromUser = useTokensFromUser()
  const tokensFromLists = useTokensFromLists()

  const [newToken, setNewToken] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)

  const numberOfRows = isLarge ? 5 : 3.5

  const getBalance = useCallback(
    (address: string) => {
      if (address === ETH_IDENTIFIER) {
        return isDepositMode ? ethL1Balance : ethL2Balance
      }

      if (isDepositMode) {
        return erc20L1Balances?.[address.toLowerCase()]
      }

      if (typeof bridgeTokens === 'undefined') {
        return null
      }

      const l2Address = bridgeTokens[address.toLowerCase()]?.l2Address
      return l2Address ? erc20L2Balances?.[l2Address.toLowerCase()] : null
    },
    [
      bridgeTokens,
      erc20L1Balances,
      erc20L2Balances,
      ethL1Balance,
      ethL2Balance,
      isDepositMode
    ]
  )

  const tokensToShow = useMemo(() => {
    const tokenSearch = newToken.trim().toLowerCase()
    const tokens = [
      ETH_IDENTIFIER,
      // Deduplicate addresses
      ...new Set([
        ...Object.keys(tokensFromUser),
        ...Object.keys(tokensFromLists)
      ])
    ]
    return tokens
      .filter(address => {
        // Derive the token object from the address string
        const token = tokensFromUser[address] || tokensFromLists[address]

        // Which tokens to show while the search is not active
        if (!tokenSearch) {
          // Always show ETH
          if (address === ETH_IDENTIFIER) {
            return true
          }

          // Always show official ARB token
          if (token?.listIds.has(SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID)) {
            return true
          }

          const balance = getBalance(address)
          // Only show tokens with a balance greater than zero
          return balance && balance.gt(0)
        }

        if (address === ETH_IDENTIFIER) {
          return 'ethereumeth'.includes(tokenSearch)
        }

        if (!token) {
          return false
        }

        const { name, symbol, address: tokenAddress, l2Address = '' } = token

        return (name + symbol + tokenAddress + l2Address)
          .toLowerCase()
          .includes(tokenSearch)
      })
      .sort((address1: string, address2: string) => {
        // Pin ETH to top
        if (address1 === ETH_IDENTIFIER) {
          return -1
        }

        // Pin ETH to top
        if (address2 === ETH_IDENTIFIER) {
          return 1
        }

        const bal1 = getBalance(address1)
        const bal2 = getBalance(address2)

        if (!(bal1 || bal2)) {
          return 0
        }
        if (!bal1) {
          return 1
        }
        if (!bal2) {
          return -1
        }
        return bal1.gt(bal2) ? -1 : 1
      })
  }, [tokensFromLists, tokensFromUser, newToken, getBalance])

  const storeNewToken = async () => {
    return token.add(newToken).catch((ex: Error) => {
      let error = 'Token not found on this network.'

      if (ex.name === 'TokenDisabledError') {
        error = 'This token is currently paused in the bridge.'
      }

      setErrorMessage(error)
    })
  }

  const addNewToken: FormEventHandler = async e => {
    e.preventDefault()
    setErrorMessage('')

    if (!isAddress(newToken) || isAddingToken) {
      return
    }

    setIsAddingToken(true)

    try {
      await storeNewToken()
    } catch (ex) {
      console.log(ex)
    } finally {
      setIsAddingToken(false)
    }
  }

  return (
    <div className="flex flex-col space-y-3">
      <form onSubmit={addNewToken} className="flex flex-col">
        <div className="flex items-stretch gap-2">
          <input
            id="newTokenAddress"
            value={newToken}
            onChange={e => {
              setErrorMessage('')
              setNewToken(e.target.value)
            }}
            placeholder="Search by token name, symbol, L1 or L2 address"
            className="h-10 w-full rounded-md border border-gray-4 px-2 text-sm text-dark"
          />

          <Button
            type="submit"
            variant="secondary"
            loading={isAddingToken}
            loadingProps={{ loaderColor: '#999999' /** text-gray-9 */ }}
            disabled={newToken === '' || !isAddress(newToken)}
            className="border border-dark py-1 disabled:border disabled:border-current disabled:bg-white disabled:text-gray-6"
            aria-label="Add New Token"
          >
            Add
          </Button>
        </div>
        {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}
      </form>
      <div
        className="flex flex-grow flex-col overflow-auto rounded-md border border-gray-4 lg:shadow-[0px_4px_10px_rgba(120,120,120,0.25)]"
        data-cy="tokenSearchList"
      >
        <AutoSizer disableHeight>
          {({ width }) => (
            <List
              width={width - 2}
              height={numberOfRows * 84}
              rowCount={tokensToShow.length}
              rowHeight={84}
              rowRenderer={virtualizedProps => {
                const address = tokensToShow[virtualizedProps.index]

                if (address === ETH_IDENTIFIER) {
                  return (
                    <TokenRow
                      key="TokenRowEther"
                      onClick={() => onTokenSelected(null)}
                      token={null}
                    />
                  )
                }

                let token: ERC20BridgeToken | null = null
                if (address) {
                  token =
                    tokensFromLists[address] || tokensFromUser[address] || null
                }

                return (
                  <TokenRow
                    key={address}
                    style={virtualizedProps.style}
                    onClick={() => onTokenSelected(token)}
                    token={token}
                  />
                )
              }}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  )
}

export function TokenSearch({
  close,
  onImportToken
}: {
  close: () => void
  onImportToken: (address: string) => void
}) {
  const {
    app: {
      arbTokenBridge: { token, bridgeTokens, walletAddress }
    }
  } = useAppState()
  const {
    app: { setSelectedToken }
  } = useActions()
  const { l1, l2 } = useNetworksAndSigners()

  const { isValidating: isFetchingTokenLists } = useTokenLists(
    l2.network.chainID
  ) // to show a small loader while token-lists are loading when search panel opens

  const [currentPanel, setCurrentPanel] = useState(Panel.TOKENS)

  async function selectToken(_token: ERC20BridgeToken | null) {
    close()

    if (_token === null) {
      setSelectedToken(null)
      return
    }

    if (!_token.address) {
      return
    }

    if (typeof bridgeTokens === 'undefined') {
      return
    }

    try {
      // Token not added to the bridge, so we'll handle importing it
      if (typeof bridgeTokens[_token.address] === 'undefined') {
        onImportToken(_token.address)
        return
      }

      const data = await getL1TokenData({
        account: walletAddress,
        erc20L1Address: _token.address,
        l1Provider: l1.provider,
        l2Provider: l2.provider
      })

      if (data) {
        token.updateTokenData(_token.address)
        setSelectedToken({
          ...toERC20BridgeToken(data),
          l2Address: _token.l2Address
        })
      }
    } catch (error: any) {
      console.warn(error)

      if (error.name === 'TokenDisabledError') {
        alert('This token is currently paused in the bridge')
      }
    }
  }

  if (currentPanel === Panel.TOKENS) {
    return (
      <>
        <div className="flex flex-row items-center justify-between pb-4">
          <span className="text-xl font-medium">Select Token</span>
          <button className="arb-hover" onClick={close}>
            <XIcon className="h-6 w-6 text-gray-7" />
          </button>
        </div>
        <TokensPanel onTokenSelected={selectToken} />
        <div className="flex justify-end pt-6">
          {isFetchingTokenLists ? (
            <span className="flex flex-row items-center gap-2 text-sm font-normal text-gray-9">
              <Loader color="#28A0F0" size="small" />
              Fetching Tokens...
            </span>
          ) : (
            <button
              className="arb-hover text-gray text-sm font-medium text-blue-link"
              onClick={() => setCurrentPanel(Panel.LISTS)}
            >
              Manage token lists
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex flex-row items-center justify-between pb-4">
        <span className="text-xl font-medium">Token Lists</span>
        <button className="arb-hover" onClick={close}>
          <XIcon className="h-6 w-6 text-gray-7" />
        </button>
      </div>
      <div className="flex justify-start pb-6">
        <button
          className="arb-hover flex items-center space-x-2 text-sm font-medium text-blue-link"
          onClick={() => setCurrentPanel(Panel.TOKENS)}
        >
          <ArrowSmLeftIcon className="h-6 w-6" />
          <span>Back to Select Token</span>
        </button>
      </div>
      <TokenListsPanel />
    </>
  )
}
