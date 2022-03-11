import React, { FormEventHandler, useMemo, useState, useCallback } from 'react'

import { BigNumber, constants } from 'ethers'
import { isAddress, formatUnits } from 'ethers/lib/utils'
import Loader from 'react-loader-spinner'
import { AutoSizer, List } from 'react-virtualized'

import { useActions, useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  BridgeTokenList,
  listIdsToNames,
  addBridgeTokenListToBridge,
  getTokenLists,
  useTokenLists
} from '../../tokenLists'
import { resolveTokenImg } from '../../util'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import TokenBlacklistedDialog from './TokenBlacklistedDialog'
import TokenConfirmationDialog from './TokenConfirmationDialog'

interface TokenRowProps {
  style?: React.CSSProperties
  onClick: React.MouseEventHandler<HTMLButtonElement>
  token: {
    name: string
    symbol: string
    logoURI?: string
    address?: string
    balance: BigNumber | null | undefined
    tokenListInfo?: string
  }
}

enum Pannel {
  TOKENS,
  LISTS
}

const TokenRow = ({
  style,
  onClick,
  token: { name, symbol, logoURI, address, balance, tokenListInfo }
}: TokenRowProps): JSX.Element => {
  const {
    app: { l1NetworkDetails }
  } = useAppState()

  const resolvedLogoURI = useMemo(() => {
    if (!logoURI) {
      return undefined
    }

    return resolveTokenImg(logoURI)
  }, [logoURI])

  return (
    <button
      type="button"
      style={style}
      onClick={onClick}
      className="flex items-center justify-between border border-gray-300 rounded-md px-6 py-3 bg-white hover:bg-gray-100"
    >
      <div className="flex items-center">
        {resolvedLogoURI ? (
          <img
            src={resolvedLogoURI}
            alt={`${name} logo`}
            className="rounded-full w-8 h-8 mr-4"
          />
        ) : (
          <div className="rounded-full w-8 h-8 mr-4 bg-navy" />
        )}

        <div className="flex flex-col items-start">
          <span className="text-base leading-6 font-bold text-gray-900">
            {name}{' '}
            <span className="text-xs text-gray-600 font-normal">
              {tokenListInfo}
            </span>
          </span>
          {/* TODO: anchor shouldn't be nested within a button */}
          <a
            href={`${l1NetworkDetails?.explorerUrl}/token/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline text-blue-800"
            onClick={e => e.stopPropagation()}
          >
            {address?.toLowerCase()}
          </a>
        </div>
      </div>

      {/* {isImported || address === null ? ( */}
      <p className="flex items-center text-base leading-6 font-medium text-gray-900">
        0 {symbol}
        {/* {balance ? (
          // @ts-ignore
          +formatUnits(balance, token?.decimals || 18)
        ) : (
          <Loader
            type="Oval"
            color="rgb(40, 160, 240)"
            height={14}
            width={14}
          />
        )}{' '}
        {symbol} */}
      </p>
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

export function TokenModalBody({
  onTokenSelected,
  toggleCurrentPannel
}: {
  onTokenSelected: () => void
  toggleCurrentPannel: () => void
}): JSX.Element {
  const {
    app: {
      arbTokenBridge: { balances, token, bridgeTokens },
      isDepositMode,
      l1NetworkDetails,
      l2NetworkDetails
    }
  } = useAppState()

  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [blacklistedOpen, setBlacklistedOpen] = useState(false)

  const [newToken, setNewToken] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)

  const tokenLists = useTokenLists(l2NetworkDetails?.chainID)

  const tokens = useMemo(() => {
    if (!l1NetworkDetails?.chainID || !l2NetworkDetails?.chainID) {
      return {}
    }

    return (
      tokenLists
        //
        .reduce((acc: any, tokenList) => {
          tokenList.tokens.forEach(token => {
            if (
              !token ||
              !token.address ||
              typeof token.address.toLowerCase !== 'function'
            ) {
              return
            }

            const address = token.address.toLowerCase()
            const stringifiedChainId = String(token.chainId)

            if (stringifiedChainId === l1NetworkDetails.chainID) {
              // The token is an L1 token

              if (typeof acc[address] === 'undefined') {
                acc[address] = token
                acc[address].tokenLists = []
                acc[address].address = { l1: address, l2: undefined }
              } else {
                acc[address] = { ...token, ...acc[address] }
              }

              if (
                !acc[address].tokenLists.includes(tokenList.bridgeTokenListId)
              ) {
                acc[address].tokenLists.push(tokenList.bridgeTokenListId)
              }
            } else if (stringifiedChainId === l2NetworkDetails.chainID) {
              // The token is an L2 token
              if (
                token.extensions &&
                token.extensions['bridgeInfo'] &&
                // @ts-ignore
                token.extensions['bridgeInfo'][l1NetworkDetails.chainID]
              ) {
                const addressOnL1 =
                  // @ts-ignore
                  token.extensions['bridgeInfo'][l1NetworkDetails.chainID]
                    .tokenAddress

                if (!addressOnL1) {
                  return
                }

                if (typeof acc[addressOnL1] === 'undefined') {
                  acc[addressOnL1] = {
                    tokenLists: [],
                    address: { l1: undefined, l2: address }
                  }
                } else {
                  acc[addressOnL1].address.l2 = address
                }

                if (
                  !acc[addressOnL1].tokenLists.includes(
                    tokenList.bridgeTokenListId
                  )
                ) {
                  acc[addressOnL1].tokenLists.push(tokenList.bridgeTokenListId)
                }
              }
            }
          })

          return acc
        }, {})
    )
  }, [l1NetworkDetails, l2NetworkDetails, tokenLists])

  const tokensToShow = useMemo(() => {
    const tokenSearch = newToken.trim().toLowerCase()

    return Object.keys(tokens)
      .sort((address1: string, address2: string) => {
        const bal1 = isDepositMode
          ? balances?.erc20[address1]?.balance
          : balances?.erc20[address1]?.arbChainBalance
        const bal2 = isDepositMode
          ? balances?.erc20[address2]?.balance
          : balances?.erc20[address2]?.arbChainBalance
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
      .filter((address: string) => {
        if (!tokenSearch) {
          return false
        }

        const token = tokens[address]

        return (token.name + token.symbol + token.address.l1 + token.address.l2)
          .toLowerCase()
          .includes(tokenSearch)
      })
  }, [tokens, isDepositMode, newToken, balances])

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
      <div className="flex flex-col gap-4 overflow-auto max-h-tokenList">
        <TokenRow
          key="TokenRowEther"
          onClick={() => {}}
          token={{
            name: 'Ether',
            symbol: 'ETH',
            logoURI:
              'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png',
            balance: isDepositMode
              ? balances?.eth.balance
              : balances?.eth.arbChainBalance
          }}
        />
        <AutoSizer disableHeight>
          {({ width }) => (
            <List
              width={width}
              height={410}
              rowCount={tokensToShow.length}
              rowHeight={74}
              rowRenderer={virtualizedProps => {
                const address = tokensToShow[virtualizedProps.index]

                const tokenListInfo: string = (() => {
                  if (tokens[address].tokenLists.length < 3) {
                    return tokens[address].tokenLists
                      .map((tokenListId: any) => listIdsToNames[tokenListId])
                      .join(', ')
                  }

                  const firstTwoLists = tokens[address].tokenLists.slice(0, 2)
                  const more = tokens[address].tokenLists.length - 2

                  return (
                    firstTwoLists
                      .map((tokenListId: any) => listIdsToNames[tokenListId])
                      .join(', ') + ` and ${more} more`
                  )
                })()

                return (
                  <TokenRow
                    key={virtualizedProps.key}
                    style={virtualizedProps.style}
                    onClick={() => {}}
                    token={{
                      name: tokens[address].name,
                      symbol: tokens[address].symbol,
                      logoURI: tokens[address].logoURI,
                      address: address,
                      balance: isDepositMode
                        ? balances?.erc20[address]?.balance
                        : balances?.erc20[address]?.arbChainBalance,
                      tokenListInfo: tokenListInfo
                    }}
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
  const [currentPannel, setCurrentPannel] = useState(Pannel.TOKENS)

  const toggleCurrentPannel = useCallback(() => {
    setCurrentPannel(
      currentPannel === Pannel.TOKENS ? Pannel.LISTS : Pannel.TOKENS
    )
  }, [currentPannel])
  const title = useMemo(() => {
    switch (currentPannel) {
      case Pannel.TOKENS:
        return 'Choose token'
      case Pannel.LISTS:
        return 'Select Token List'
      default:
        throw new Error('Unhandled switch case')
    }
  }, [currentPannel])

  const buttonText = useMemo(() => {
    switch (currentPannel) {
      case Pannel.TOKENS:
        return 'View Token Lists ↗'
      case Pannel.LISTS:
        return 'View Tokens ↗'
      default:
        throw new Error('Unhandled switch case')
    }
  }, [currentPannel])
  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={title}
      buttonText={buttonText}
      buttonAction={toggleCurrentPannel}
    >
      {currentPannel === Pannel.TOKENS ? (
        <TokenModalBody
          onTokenSelected={() => setIsOpen(false)}
          toggleCurrentPannel={toggleCurrentPannel}
        />
      ) : (
        <TokenListBody />
      )}
    </Modal>
  )
}

export { TokenModal }
