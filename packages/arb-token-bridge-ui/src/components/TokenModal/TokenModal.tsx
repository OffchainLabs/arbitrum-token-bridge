import React, {
  FormEventHandler,
  useMemo,
  useState,
  useCallback,
  useContext
} from 'react'
import { useMedia } from 'react-use'
import { BigNumber } from 'ethers'
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
import TokenBlacklistedDialog from './TokenBlacklistedDialog'
import TokenConfirmationDialog from './TokenConfirmationDialog'
import {
  SearchableToken,
  useTokensFromLists,
  useTokensFromUser
} from './TokenModalUtils'

interface TokenRowProps {
  style?: React.CSSProperties
  onClick: React.MouseEventHandler<HTMLButtonElement>
  token: SearchableToken | null
  tokenBalance: BigNumber | undefined | null
}

enum Panel {
  TOKENS,
  LISTS
}

function tokenListIdsToNames(ids: number[]): string {
  return ids
    .map((tokenListId: number) => listIdsToNames[tokenListId])
    .join(', ')
}

function TokenRow({
  style,
  onClick,
  token,
  tokenBalance
}: TokenRowProps): JSX.Element {
  const {
    app: {
      l1NetworkDetails,
      arbTokenBridge: { bridgeTokens }
    }
  } = useAppState()

  const tokenName = useMemo(() => (token ? token.name : 'Ether'), [token])

  const tokenLogoURI = useMemo(() => {
    if (!token) {
      return 'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png'
    }

    if (!token.logoURI) {
      return undefined
    }

    return resolveTokenImg(token.logoURI)
  }, [token])

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

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...style, minHeight: '84px' }}
      className="w-full flex flex-col items-center sm:flex-row sm:justify-between p-2 sm:px-6 sm:py-3 bg-white hover:bg-gray-100"
    >
      <div className="w-full flex flex-row items-center justify-start space-x-2 sm:space-x-4">
        {tokenLogoURI ? (
          <img
            src={tokenLogoURI}
            alt={`${tokenName} logo`}
            className="rounded-full w-4 sm:w-8 h-4 sm:h-8 flex-grow-0"
          />
        ) : (
          <div className="rounded-full w-4 sm:w-8 h-4 sm:h-8 bg-navy" />
        )}

        <div className="flex flex-col items-start truncate">
          <div>
            <span className="font-bold text-xs sm:text-base leading-6 text-gray-900">
              {tokenName}
            </span>
            {token && (
              <span className="text-xs text-gray-600 font-normal">
                {' '}
                {tokenListInfo}
              </span>
            )}
          </div>
          {token && (
            // TODO: anchor shouldn't be nested within a button
            <a
              href={`${l1NetworkDetails?.explorerUrl}/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline text-blue-800"
              onClick={e => e.stopPropagation()}
            >
              {token.address.toLowerCase()}
            </a>
          )}
        </div>
      </div>

      {tokenIsAddedToTheBridge ? (
        <span className="flex items-center text-xs sm:text-base leading-6 font-medium text-gray-900 whitespace-nowrap">
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
          {token ? token.symbol : 'ETH'}
        </span>
      ) : (
        <span className="text-xs sm:text-base font-medium text-gray-900">
          Import
        </span>
      )}
    </button>
  )
}

export const TokenListBody = () => {
  const {
    app: { l2NetworkDetails, arbTokenBridge }
  } = useAppState()
  const {
    bridgeTokens,
    token: { removeTokensFromList }
  } = arbTokenBridge
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
      removeTokensFromList(bridgeTokenList.id)
    } else {
      addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
    }
  }
  return (
    <div className="flex flex-col gap-6">
      {listsToShow.map(tokenList => {
        const isActive = Object.keys(bridgeTokens).some(address => {
          const token = bridgeTokens[address]
          return !!(token && tokenList.id === token.listID)
        })

        return (
          <div key={tokenList.id} className="flex items-center">
            <div className="text-base leading-6 font-bold text-gray-900">
              {tokenList.name}{' '}
            </div>
            <img
              src={tokenList.logoURI}
              alt="logo"
              className="rounded-full w-8 h-8 mr-4"
            />
            <div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleTokenList(tokenList, isActive)}
                />
                <span className="slider round"></span>
              </label>
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

const SpecialETHAddress = 'eth.address'

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
      if (address === SpecialETHAddress) {
        return isDepositMode
          ? balances?.eth?.balance
          : balances?.eth?.arbChainBalance
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
      SpecialETHAddress,
      ...Object.keys(tokensFromUser),
      ...Object.keys(tokensFromLists)
    ]
      .filter((address: string) => {
        if (!tokenSearch) {
          return true
        }

        if (address === SpecialETHAddress) {
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
            className="text-dark-blue shadow-sm border border-gray-300 rounded-md px-2 w-full h-10"
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
              'Add'
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

                if (address === SpecialETHAddress) {
                  return (
                    <TokenRow
                      key="TokenRowEther"
                      onClick={() => onTokenSelected(null)}
                      token={null}
                      tokenBalance={
                        isDepositMode
                          ? balances?.eth.balance
                          : balances?.eth.arbChainBalance
                      }
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
                    tokenBalance={
                      isDepositMode
                        ? balances?.erc20[address]?.balance
                        : balances?.erc20[address]?.arbChainBalance
                    }
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
  setIsOpen
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
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

  const toggleCurrentPanel = useCallback(() => {
    setCurrentPanel(currentPanel === Panel.TOKENS ? Panel.LISTS : Panel.TOKENS)
  }, [currentPanel])

  const title = useMemo(() => {
    switch (currentPanel) {
      case Panel.TOKENS:
        return 'Choose token'
      case Panel.LISTS:
        return 'Select Token List'
      default:
        throw new Error('Unhandled switch case')
    }
  }, [currentPanel])

  const buttonText = useMemo(() => {
    switch (currentPanel) {
      case Panel.TOKENS:
        return 'View Token Lists ↗'
      case Panel.LISTS:
        return 'View Tokens ↗'
      default:
        throw new Error('Unhandled switch case')
    }
  }, [currentPanel])

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
      if (typeof bridgeTokens[_token.address] === 'undefined') {
        await token.add(_token.address)
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
    <Modal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={title}
      buttonText={buttonText}
      buttonAction={toggleCurrentPanel}
    >
      {currentPanel === Panel.TOKENS ? (
        <TokenModalBody onTokenSelected={selectToken} />
      ) : (
        <TokenListBody />
      )}
    </Modal>
  )
}

export { TokenModal }
