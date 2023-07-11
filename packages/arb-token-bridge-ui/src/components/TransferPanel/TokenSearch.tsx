import React, { FormEventHandler, useMemo, useState, useCallback } from 'react'
import { isAddress } from 'ethers/lib/utils'
import { AutoSizer, List } from 'react-virtualized'
import {
  XMarkIcon,
  ArrowSmallLeftIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useMedia } from 'react-use'
import Image from 'next/image'

import { Loader } from '../common/atoms/Loader'
import { useActions, useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  BridgeTokenList,
  addBridgeTokenListToBridge,
  SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID
} from '../../util/TokenListUtils'
import { getL1TokenData, isArbOneNativeUSDC } from '../../util/TokenUtils'
import { Button } from '../common/Button'
import {
  useTokensFromLists,
  useTokensFromUser,
  toERC20BridgeToken
} from './TokenSearchUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useBalance } from '../../hooks/useBalance'
import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types'
import { useTokenLists } from '../../hooks/useTokenLists'
import { warningToast } from '../common/atoms/Toast'
import { TokenRow } from './TokenRow'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { ArbOneNativeUSDC } from '../../util/L2NativeUtils'
import { isNetwork } from '../../util/networks'
import { useUSDCWithdrawalConfirmationDialogStore } from './TransferPanel'

enum Panel {
  TOKENS,
  LISTS
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

      return tokenList.originChainID === l2Network.id
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
    l2: { provider: L2Provider, network: l2Network }
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
    const tokenAddresses = [
      ...Object.keys(tokensFromUser),
      ...Object.keys(tokensFromLists)
    ]
    if (!isDepositMode && isNetwork(l2Network.id).isArbitrumOne) {
      tokenAddresses.push(CommonAddress.ArbitrumOne.USDC)
    }
    const tokens = [
      ETH_IDENTIFIER,
      // Deduplicate addresses
      ...new Set(tokenAddresses)
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

          if (isArbOneNativeUSDC(address)) {
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
  }, [tokensFromLists, tokensFromUser, newToken, getBalance, l2Network])

  const storeNewToken = async () => {
    let error = 'Token not found on this network.'
    let isSuccessful = false

    try {
      // Try to add the token as an L2-native token
      token.addL2NativeToken(newToken)
      isSuccessful = true
    } catch (error) {
      //
    }

    try {
      // Try to add the token as a regular bridged token
      await token.add(newToken)
      isSuccessful = true
    } catch (ex: any) {
      if (ex.name === 'TokenDisabledError') {
        error = 'This token is currently paused in the bridge.'
      }
    }

    // Only show error message if neither succeeded
    if (!isSuccessful) {
      setErrorMessage(error)
    }
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
          <div className="relative flex h-full w-full grow items-center rounded-lg border-[1px] border-gray-dark bg-white px-2 text-gray-dark shadow-input">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-dark" />

            <input
              id="newTokenAddress"
              value={newToken}
              onChange={e => {
                setErrorMessage('')
                setNewToken(e.target.value)
              }}
              placeholder="Search by token name, symbol, L1 or L2 address"
              className="h-full w-full p-2 text-sm font-light text-dark placeholder:text-gray-dark"
            />
          </div>

          <Button
            type="submit"
            variant="secondary"
            loading={isAddingToken}
            loadingProps={{ loaderColor: '#999999' /** text-gray-6 */ }}
            disabled={newToken === '' || !isAddress(newToken)}
            className="border border-dark py-1 disabled:border disabled:border-current disabled:bg-white disabled:text-gray-4"
            aria-label="Add New Token"
          >
            Add
          </Button>
        </div>
        {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}
      </form>
      <div
        className="flex flex-grow flex-col overflow-auto rounded-md border border-gray-2 lg:shadow-[0px_4px_10px_rgba(120,120,120,0.25)]"
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

                  if (isArbOneNativeUSDC(address)) {
                    token = {
                      listIds: new Set<number>(),
                      type: TokenType.ERC20,
                      l2Address: CommonAddress.ArbitrumOne.USDC,
                      ...ArbOneNativeUSDC
                    }
                  }
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
  const { openDialog: openUSDCWithdrawalConfirmationDialog } =
    useUSDCWithdrawalConfirmationDialogStore()

  const { isValidating: isFetchingTokenLists } = useTokenLists(l2.network.id) // to show a small loader while token-lists are loading when search panel opens

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
      if (isArbOneNativeUSDC(_token.address)) {
        openUSDCWithdrawalConfirmationDialog()
        return
      }

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
        warningToast('This token is currently paused in the bridge')
      }
    }
  }

  if (currentPanel === Panel.TOKENS) {
    return (
      <>
        <div className="flex flex-row items-center justify-between pb-4">
          <span className="text-xl font-medium">Select Token</span>
          <button className="arb-hover" onClick={close}>
            <XMarkIcon className="h-6 w-6 text-gray-5" />
          </button>
        </div>
        <TokensPanel onTokenSelected={selectToken} />
        <div className="flex justify-end pt-6">
          {isFetchingTokenLists ? (
            <span className="flex flex-row items-center gap-2 text-sm font-normal text-gray-6">
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
          <XMarkIcon className="h-6 w-6 text-gray-5" />
        </button>
      </div>
      <div className="flex justify-start pb-6">
        <button
          className="arb-hover flex items-center space-x-2 text-sm font-medium text-blue-link"
          onClick={() => setCurrentPanel(Panel.TOKENS)}
        >
          <ArrowSmallLeftIcon className="h-6 w-6" />
          <span>Back to Select Token</span>
        </button>
      </div>
      <TokenListsPanel />
    </>
  )
}
