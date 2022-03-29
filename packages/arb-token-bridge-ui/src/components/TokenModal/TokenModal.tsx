import React, {
  FormEventHandler,
  useMemo,
  useState,
  useCallback,
  useContext
} from 'react'
import { useMedia } from 'react-use'
import { isAddress, formatUnits } from 'ethers/lib/utils'
import Loader from 'react-loader-spinner'
import { AutoSizer, List } from 'react-virtualized'
import { L1TokenData } from 'arb-ts'
import { ERC20BridgeToken, TokenType } from 'token-bridge-sdk'

import { BridgeContext } from '../App/App'
import { useActions, useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  BridgeTokenList,
  listIdsToNames,
  addBridgeTokenListToBridge
} from '../../tokenLists'
import { resolveTokenImg } from '../../util'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { SafeImage } from '../common/SafeImage'
import TokenBlacklistedDialog from './TokenBlacklistedDialog'
import TokenConfirmationDialog from './TokenConfirmationDialog'
import {
  SearchableToken,
  useTokensFromLists,
  useTokensFromUser
} from './TokenModalUtils'

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
    <div className="flex rounded-full w-4 sm:w-8 h-4 sm:h-8 bg-navy items-center justify-center text-white text-sm font-medium">
      ?
    </div>
  )
}

interface TokenRowProps {
  style?: React.CSSProperties
  onClick: React.MouseEventHandler<HTMLButtonElement>
  token: SearchableToken | null
}

function TokenRow({ style, onClick, token }: TokenRowProps): JSX.Element {
  const {
    app: {
      arbTokenBridge: { bridgeTokens, balances },
      l1NetworkDetails,
      l2NetworkDetails,
      isDepositMode
    }
  } = useAppState()

  const tokenName = useMemo(() => (token ? token.name : 'Ether'), [token])
  const tokenSymbol = useMemo(() => (token ? token.symbol : 'ETH'), [token])

  const tokenLogoURI = useMemo(() => {
    if (!token) {
      return 'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png'
    }

    if (!token.logoURI) {
      return undefined
    }

    return resolveTokenImg(token.logoURI)
  }, [token])

  const tokenBalance = useMemo(() => {
    if (!token) {
      return isDepositMode
        ? balances?.eth.balance
        : balances?.eth.arbChainBalance
    }

    return isDepositMode
      ? balances?.erc20[token.address]?.balance
      : balances?.erc20[token.address]?.arbChainBalance
  }, [token, isDepositMode, balances])

  const tokenListInfo = useMemo(() => {
    if (!token) {
      return null
    }

    const tokenLists = token.tokenLists

    if (tokenLists.length === 0) {
      return 'Added by User'
    }

    if (tokenLists.length < 3) {
      return tokenListIdsToNames(tokenLists)
    }

    const firstTwoLists = tokenLists.slice(0, 2)
    const more = tokenLists.length - 2

    return tokenListIdsToNames(firstTwoLists) + ` and ${more} more`
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
      className="w-full flex flex-col items-center sm:flex-row justify-center sm:justify-between p-2 sm:px-6 sm:py-3 bg-white hover:bg-gray-100"
    >
      <div className="w-full flex flex-row items-center justify-start space-x-2 sm:space-x-4">
        <SafeImage
          src={tokenLogoURI}
          alt={`${tokenName} logo`}
          className="rounded-full w-4 sm:w-8 h-4 sm:h-8 flex-grow-0"
          fallback={<TokenLogoFallback />}
        />

        <div className="flex flex-col items-start truncate">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-xs sm:text-base text-gray-900">
              {tokenSymbol}
            </span>
            <span className="text-xs text-gray-500">{tokenName}</span>
          </div>
          {token && (
            <div className="flex flex-col items-start sm:space-y-1">
              {/* TODO: anchor shouldn't be nested within a button */}
              {isDepositMode ? (
                <a
                  href={`${l1NetworkDetails?.explorerUrl}/token/${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline text-dark-blue"
                  onClick={e => e.stopPropagation()}
                >
                  {token.address.toLowerCase()}
                </a>
              ) : (
                <>
                  {tokenHasL2Address ? (
                    <a
                      href={`${l2NetworkDetails?.explorerUrl}/token/${token.l2Address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline text-dark-blue"
                      onClick={e => e.stopPropagation()}
                    >
                      {token.l2Address?.toLowerCase()}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-900">
                      This token hasn't been bridged to L2
                    </span>
                  )}
                </>
              )}
              <span className="text-xs text-gray-500 font-normal">
                {tokenListInfo}
              </span>
            </div>
          )}
        </div>
      </div>

      {tokenIsBridgeable && (
        <>
          {tokenIsAddedToTheBridge ? (
            <span className="flex items-center text-xs sm:text-sm text-gray-500 whitespace-nowrap">
              {tokenBalance ? (
                formatUnits(tokenBalance, token ? token.decimals : 18)
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
            <span className="text-xs sm:text-sm text-dark-blue font-medium">
              Import
            </span>
          )}
        </>
      )}
    </button>
  )
}

export const TokenListBody = () => {
  const {
    app: { l2NetworkDetails, arbTokenBridge }
  } = useAppState()
  const { bridgeTokens, token } = arbTokenBridge

  const listsToShow: BridgeTokenList[] = BRIDGE_TOKEN_LISTS.filter(
    tokenList => {
      return !!(
        l2NetworkDetails && tokenList.originChainID === l2NetworkDetails.chainID
      )
    }
  )

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
    <div className="flex flex-col gap-6 border border-gray-300 rounded-md p-6">
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
                className="rounded-full w-6 h-6"
              />
              <span className="text-sm text-gray-900">{tokenList.name}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function toERC20BridgeToken(data: L1TokenData): ERC20BridgeToken {
  return {
    name: data.name,
    type: TokenType.ERC20,
    symbol: data.symbol,
    address: data.contract.address,
    decimals: data.decimals
  }
}

const ETH_IDENTIFIER = 'eth.address'

export function TokenModalBody({
  onTokenSelected
}: {
  onTokenSelected: (token: SearchableToken | null) => void
}): JSX.Element {
  const {
    app: {
      arbTokenBridge: { balances, token },
      isDepositMode
    }
  } = useAppState()

  const isDesktop = useMedia('(min-width: 640px)')

  const tokensFromUser = useTokensFromUser()
  const tokensFromLists = useTokensFromLists()

  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [blacklistedOpen, setBlacklistedOpen] = useState(false)

  const [newToken, setNewToken] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)

  const getBalance = useCallback(
    (address: string) => {
      if (address === ETH_IDENTIFIER) {
        return isDepositMode
          ? balances?.eth.balance
          : balances?.eth.arbChainBalance
      }

      return isDepositMode
        ? balances?.erc20[address]?.balance
        : balances?.erc20[address]?.arbChainBalance
    },
    [isDepositMode, balances]
  )

  const tokensToShow = useMemo(() => {
    const tokenSearch = newToken.trim().toLowerCase()

    return [
      ETH_IDENTIFIER,
      // Deduplicate addresses
      ...new Set([
        ...Object.keys(tokensFromUser),
        ...Object.keys(tokensFromLists)
      ])
    ]
      .filter((address: string) => {
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
      console.log('Token not found on this network')

      if (ex.name === 'TokenDisabledError') {
        alert('This token is currently paused in the bridge')
      }
    })
  }

  const addNewToken: FormEventHandler = async e => {
    e.preventDefault()

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
    <div className="flex flex-col gap-6">
      <TokenConfirmationDialog
        onAdd={storeNewToken}
        open={confirmationOpen}
        setOpen={setConfirmationOpen}
      />
      <TokenBlacklistedDialog
        open={blacklistedOpen}
        setOpen={setBlacklistedOpen}
      />
      <form onSubmit={addNewToken} className="flex flex-col">
        <div className="flex items-stretch gap-2">
          <input
            id="newTokenAddress"
            value={newToken}
            onChange={e => setNewToken(e.target.value)}
            placeholder="Search by token name, symbol, L1 or L2 address"
            className="text-sm text-dark-blue shadow-sm border border-gray-300 rounded-md px-2 w-full h-10"
          />

          <Button
            variant="white"
            type="submit"
            disabled={newToken === '' || !isAddress(newToken)}
          >
            {isAddingToken ? (
              <Loader
                type="Oval"
                color="rgb(45, 55, 75)"
                height={16}
                width={16}
              />
            ) : (
              <span className="text-sm font-normal">Add</span>
            )}
          </Button>
        </div>
      </form>
      <div className="flex flex-col overflow-auto max-h-tokenList border border-gray-300 rounded-md">
        <AutoSizer disableHeight>
          {({ width }) => (
            <List
              width={width - 2}
              height={isDesktop ? 380 : 200}
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
                    key={virtualizedProps.key}
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

const TokenModal = ({
  isOpen,
  setIsOpen,
  onImportToken
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onImportToken: (address: string) => void
}): JSX.Element => {
  const {
    app: {
      arbTokenBridge: { token, bridgeTokens }
    }
  } = useAppState()
  const {
    app: { setSelectedToken }
  } = useActions()
  const bridge = useContext(BridgeContext)

  const [currentPanel, setCurrentPanel] = useState(Panel.TOKENS)

  const modalTitle = useMemo(
    () => (currentPanel === Panel.TOKENS ? 'Select Token' : 'Token Lists'),
    [currentPanel]
  )

  async function selectToken(_token: SearchableToken | null) {
    setIsOpen(false)

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

      const data = await bridge?.l1Bridge.getL1TokenData(_token.address)

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

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={modalTitle} hideButton>
      {currentPanel === Panel.TOKENS ? (
        <>
          <TokenModalBody onTokenSelected={selectToken} />
          <div className="flex justify-end pt-6">
            <button
              className="text-sm text-dark-blue font-medium"
              onClick={() => setCurrentPanel(Panel.LISTS)}
            >
              Manage token lists
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-start pb-6">
            <button
              className="flex items-center space-x-2 text-sm text-dark-blue font-medium"
              onClick={() => setCurrentPanel(Panel.TOKENS)}
            >
              <svg
                width="12"
                height="10"
                viewBox="0 0 12 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.80473 0.528514C6.06508 0.788864 6.06508 1.21097 5.80473 1.47132L2.9428 4.33325H10.6667C11.0348 4.33325 11.3333 4.63173 11.3333 4.99992C11.3333 5.36811 11.0348 5.66658 10.6667 5.66658H2.9428L5.80473 8.52851C6.06508 8.78886 6.06508 9.21097 5.80473 9.47132C5.54438 9.73167 5.12227 9.73167 4.86192 9.47132L0.861919 5.47132C0.736894 5.3463 0.666656 5.17673 0.666656 4.99992C0.666656 4.82311 0.736894 4.65354 0.861919 4.52851L4.86192 0.528514C5.12227 0.268165 5.54438 0.268165 5.80473 0.528514Z"
                  fill="#2D49A7"
                />
              </svg>
              <span>Back to Select Token</span>
            </button>
          </div>
          <TokenListBody />
        </>
      )}
    </Modal>
  )
}

export { TokenModal }
