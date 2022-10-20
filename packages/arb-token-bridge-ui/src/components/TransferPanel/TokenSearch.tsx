import React, { FormEventHandler, useMemo, useState, useCallback } from 'react'
import { isAddress } from 'ethers/lib/utils'
import Loader from 'react-loader-spinner'
import { AutoSizer, List } from 'react-virtualized'
import { XIcon, ArrowSmLeftIcon } from '@heroicons/react/outline'
import { useMedia } from 'react-use'
import { BigNumber } from 'ethers'

import { useActions, useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  BridgeTokenList,
  listIdsToNames,
  addBridgeTokenListToBridge
} from '../../tokenLists'
import { formatBigNumber } from '../../util/NumberUtils'
import { Button } from '../common/Button'
import { SafeImage } from '../common/SafeImage'
import {
  SearchableToken,
  useTokensFromLists,
  useTokensFromUser,
  toERC20BridgeToken
} from './TokenSearchUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useBalance, getL1TokenData } from 'token-bridge-sdk'
import { getExplorerUrl } from '../../util/networks'

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

function shortenAddress(address: string) {
  const len = address.length
  return `${address.substring(0, 5)}...${address.substring(len - 4, len)}`
}

interface TokenRowProps {
  style?: React.CSSProperties
  onClick: React.MouseEventHandler<HTMLButtonElement>
  token: SearchableToken | null
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
      return BigNumber.from(0)
    }

    return erc20L2Balances?.[token.l2Address.toLowerCase()] ?? BigNumber.from(0)
  }, [
    ethL1Balance,
    ethL2Balance,
    token,
    isDepositMode,
    erc20L1Balances,
    erc20L2Balances
  ])

  const tokenListInfo = useMemo(() => {
    if (!token) {
      return null
    }

    const tokenLists = token.tokenLists

    if (tokenLists.length === 0) {
      return 'Added by User'
    }

    if (tokenLists.length < 2) {
      return tokenListIdsToNames(tokenLists)
    }

    const firstList = tokenLists.slice(0, 1)
    const more = tokenLists.length - 1

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
          className="h-8 w-8 flex-grow-0 rounded-full"
          fallback={<TokenLogoFallback />}
        />

        <div className="flex flex-col items-start truncate">
          <div className="flex items-center space-x-2">
            <span className="text-base font-medium text-gray-900">
              {tokenSymbol}
            </span>
            <span className="text-xs text-gray-500">{tokenName}</span>
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
                      This token hasn't been bridged to L2
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
                formatBigNumber(tokenBalance, token?.decimals || 18)
              ) : (
                <div className="mr-2">
                  <Loader
                    type="Oval"
                    color="rgb(40, 160, 240)"
                    height={14}
                    width={14}
                  />
                </div>
              )}{' '}
              {tokenSymbol}
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

    return BRIDGE_TOKEN_LISTS.filter(
      tokenList => tokenList.originChainID === String(l2Network.chainID)
    )
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
          return !!(token && tokenList.id === token.listID)
        })

        return (
          <div key={tokenList.id} className="flex items-center space-x-3">
            <div className="flex items-center">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleTokenList(tokenList, isActive)}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="flex flex-row items-center space-x-1">
              <img
                src={tokenList.logoURI}
                alt={`${tokenList.name} Logo`}
                className="h-6 w-6 rounded-full"
              />
              <span className="text-sm text-gray-900">{tokenList.name}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ETH_IDENTIFIER = 'eth.address'

function TokensPanel({
  onTokenSelected
}: {
  onTokenSelected: (token: SearchableToken | null) => void
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
        // Which tokens to show while the search is not active
        if (!tokenSearch) {
          // Always show ETH
          if (address === ETH_IDENTIFIER) {
            return true
          }

          const balance = getBalance(address)
          // Only show tokens with a balance greater than zero
          return balance && balance.gt(0)
        }

        if (address === ETH_IDENTIFIER) {
          return 'ethereumeth'.includes(tokenSearch)
        }

        const token = tokensFromUser[address] || tokensFromLists[address]

        return (
          token.name +
          token.symbol +
          token.address +
          // So we don't concatenate "undefined".
          (token.l2Address || '')
        )
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
            className="border border-gray-4 py-1 text-gray-9"
            aria-label="Add New Token"
          >
            Add
          </Button>
        </div>
        {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}
      </form>
      <div className="flex flex-grow flex-col overflow-auto rounded-md border border-gray-4 lg:shadow-[0px_4px_10px_rgba(120,120,120,0.25)]">
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

                const token =
                  tokensFromLists[address] || tokensFromUser[address]

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

  const [currentPanel, setCurrentPanel] = useState(Panel.TOKENS)

  async function selectToken(_token: SearchableToken | null) {
    close()

    if (_token === null) {
      setSelectedToken(null)
      return
    }

    if (!_token.address) {
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
          <button
            className="arb-hover text-sm font-medium text-blue-link"
            onClick={() => setCurrentPanel(Panel.LISTS)}
          >
            Manage token lists
          </button>
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
