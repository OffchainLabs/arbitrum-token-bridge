import React, { FormEventHandler, useMemo, useState, useCallback } from 'react'
import { isAddress } from 'ethers/lib/utils'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { AutoSizer, List, ListRowProps } from 'react-virtualized'
import { twMerge } from 'tailwind-merge'
import useSWRImmutable from 'swr/immutable'

import { useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  BridgeTokenList,
  SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID,
  addBridgeTokenListToBridge
} from '../../util/TokenListUtils'
import {
  fetchErc20Data,
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneUSDCe,
  isTokenNativeUSDC
} from '../../util/TokenUtils'
import { Button } from '../common/Button'
import { useTokensFromLists, useTokensFromUser } from './TokenSearchUtils'
import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types'
import { useTokenLists } from '../../hooks/useTokenLists'
import { warningToast } from '../common/atoms/Toast'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { ArbOneNativeUSDC } from '../../util/L2NativeUtils'
import { getNetworkName, isNetwork } from '../../util/networks'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { SearchPanelTable } from '../common/SearchPanel/SearchPanelTable'
import { SearchPanel } from '../common/SearchPanel/SearchPanel'
import { TokenRow } from './TokenRow'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { Switch } from '../common/atoms/Switch'
import { getUsdcToken, useSelectedToken } from '../../hooks/useSelectedToken'
import { useBalances } from '../../hooks/useBalances'
import { useSetInputAmount } from '../../hooks/TransferPanel/useSetInputAmount'
import { addressesEqual } from '../../util/AddressUtils'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

export const ARB_ONE_NATIVE_USDC_TOKEN = {
  ...ArbOneNativeUSDC,
  listIds: new Set<string>(),
  type: TokenType.ERC20,
  // the address field is for L1 address but native USDC does not have an L1 address
  // the L2 address is used instead to avoid errors
  address: CommonAddress.ArbitrumOne.USDC,
  l2Address: CommonAddress.ArbitrumOne.USDC
}

export const ARB_SEPOLIA_NATIVE_USDC_TOKEN = {
  ...ArbOneNativeUSDC,
  listIds: new Set<string>(),
  type: TokenType.ERC20,
  address: CommonAddress.ArbitrumSepolia.USDC,
  l2Address: CommonAddress.ArbitrumSepolia.USDC
}

function TokenListRow({ tokenList }: { tokenList: BridgeTokenList }) {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const { bridgeTokens, token } = arbTokenBridge

  const toggleTokenList = useCallback(
    (bridgeTokenList: BridgeTokenList, isActive: boolean) => {
      if (isActive) {
        token.removeTokensFromList(bridgeTokenList.id)
      } else {
        addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
      }
    },
    [arbTokenBridge, token]
  )

  const isActive = Object.keys(bridgeTokens ?? []).some(address => {
    const token = bridgeTokens?.[address]
    return token?.listIds.has(tokenList?.id)
  })

  const switchOnClick = useCallback(
    () => toggleTokenList(tokenList, isActive),
    [isActive, toggleTokenList, tokenList]
  )

  return (
    <label
      key={tokenList.id}
      className="flex cursor-pointer items-center justify-start space-x-3 duration-200 [&:hover_img]:opacity-100 [&:hover_span]:text-white"
    >
      <Switch
        name={`${tokenList.name} toggle`}
        checked={isActive}
        onChange={switchOnClick}
      />
      <div className="flex items-center gap-2">
        <Image
          src={tokenList.logoURI}
          alt={`${tokenList.name} Logo`}
          className={twMerge(
            'h-4 w-4 rounded-full transition-opacity',
            !isActive && 'opacity-70'
          )}
          width={16}
          height={16}
        />
        <span
          className={twMerge(
            'text-sm transition-colors',
            !isActive && 'text-white/70'
          )}
        >
          {tokenList.name}
        </span>
      </div>
    </label>
  )
}

function TokenListsPanel({ closePanel }: { closePanel: () => void }) {
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)

  const listsToShow: BridgeTokenList[] = useMemo(() => {
    return BRIDGE_TOKEN_LISTS.filter(tokenList => {
      if (!tokenList.isValid) {
        return false
      }

      // Don't show the Arbitrum Token token list, because it's special and can't be disabled
      if (tokenList.isArbitrumTokenTokenList) {
        return false
      }

      return tokenList.originChainID === childChain.id
    })
  }, [childChain.id])

  return (
    <>
      <SearchPanel.PageTitle title="Token Lists">
        <SearchPanel.CloseButton onClick={closePanel} />
      </SearchPanel.PageTitle>
      <div className="flex flex-col gap-6 rounded-md border border-gray-dark p-6 text-white">
        {listsToShow.map(tokenList => (
          <TokenListRow key={tokenList.id} tokenList={tokenList} />
        ))}
        {listsToShow.length === 0 && (
          <span className="text-sm leading-relaxed">
            Sorry, there are no lists of tokens bridged from{' '}
            {getNetworkName(networks.sourceChain.id)} to{' '}
            {getNetworkName(networks.destinationChain.id)}.
          </span>
        )}
      </div>
    </>
  )
}

const NATIVE_CURRENCY_IDENTIFIER = 'native_currency'

function TokensPanel({
  onTokenSelected
}: {
  onTokenSelected: (token: ERC20BridgeToken | null) => void
}): JSX.Element {
  const { address: walletAddress } = useAccount()
  const {
    app: {
      arbTokenBridge: { token, bridgeTokens }
    }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, isDepositMode } =
    useNetworksRelationship(networks)
  const {
    ethParentBalance,
    erc20ParentBalances,
    ethChildBalance,
    erc20ChildBalances
  } = useBalances({
    parentWalletAddress: walletAddress,
    childWalletAddress: walletAddress
  })

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const {
    isEthereumMainnet: isParentChainEthereumMainnet,
    isSepolia: isParentChainSepolia,
    isArbitrumOne: isParentChainArbitrumOne,
    isArbitrumSepolia: isParentChainArbitrumSepolia
  } = isNetwork(parentChain.id)
  const { isArbitrumOne, isArbitrumSepolia, isOrbitChain } = isNetwork(
    childChain.id
  )
  const tokensFromUser = useTokensFromUser()
  const tokensFromLists = useTokensFromLists()

  const [newToken, setNewToken] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)

  const getBalance = useCallback(
    (address: string) => {
      if (address === NATIVE_CURRENCY_IDENTIFIER) {
        if (nativeCurrency.isCustom) {
          return isDepositMode
            ? erc20ParentBalances?.[nativeCurrency.address]
            : ethChildBalance
        }

        return isDepositMode ? ethParentBalance : ethChildBalance
      }

      if (isDepositMode) {
        return erc20ParentBalances?.[address.toLowerCase()]
      }

      if (typeof bridgeTokens === 'undefined') {
        return null
      }

      if (
        isTokenArbitrumOneNativeUSDC(address) ||
        isTokenArbitrumSepoliaNativeUSDC(address)
      ) {
        return erc20ChildBalances?.[address.toLowerCase()]
      }

      const l2Address = bridgeTokens[address.toLowerCase()]?.l2Address
      return l2Address ? erc20ChildBalances?.[l2Address.toLowerCase()] : null
    },
    [
      nativeCurrency,
      bridgeTokens,
      erc20ParentBalances,
      erc20ChildBalances,
      ethParentBalance,
      ethChildBalance,
      isDepositMode
    ]
  )

  const usdcParentAddress = useMemo(() => {
    if (isParentChainEthereumMainnet) {
      return CommonAddress.Ethereum.USDC
    }
    if (isParentChainSepolia) {
      return CommonAddress.Sepolia.USDC
    }
    if (isParentChainArbitrumOne) {
      return CommonAddress.ArbitrumOne.USDC
    }
    if (isParentChainArbitrumSepolia) {
      return CommonAddress.ArbitrumSepolia.USDC
    }
  }, [
    isParentChainEthereumMainnet,
    isParentChainSepolia,
    isParentChainArbitrumOne,
    isParentChainArbitrumSepolia
  ])

  const { data: usdcToken = null } = useSWRImmutable(
    usdcParentAddress
      ? ([
          usdcParentAddress,
          parentChain.id,
          childChain.id,
          'token_search_usdc_token'
        ] as const)
      : null,
    ([_usdcParentAddress, _parentChainId, _childChainId]) =>
      getUsdcToken({
        tokenAddress: _usdcParentAddress,
        parentProvider: getProviderForChainId(_parentChainId),
        childProvider: getProviderForChainId(_childChainId)
      })
  )

  const tokensToShow = useMemo(() => {
    const tokenSearch = newToken.trim().toLowerCase()
    const tokenAddresses = [
      ...Object.keys(tokensFromUser),
      ...Object.keys(tokensFromLists)
    ]
    if (!isDepositMode) {
      // L2 to L1 withdrawals
      if (isArbitrumOne) {
        tokenAddresses.push(CommonAddress.ArbitrumOne.USDC)
      }
      if (isArbitrumSepolia) {
        tokenAddresses.push(CommonAddress.ArbitrumSepolia.USDC)
      }
    } else {
      // L2 to L3 deposits
      if (isParentChainArbitrumOne) {
        tokenAddresses.push(CommonAddress.ArbitrumOne.USDC)
      }
      if (isParentChainArbitrumSepolia) {
        tokenAddresses.push(CommonAddress.ArbitrumSepolia.USDC)
      }
    }

    const tokens = [
      NATIVE_CURRENCY_IDENTIFIER,
      // Deduplicate addresses
      ...new Set(tokenAddresses)
    ]
    return tokens
      .filter(address => {
        // Derive the token object from the address string
        let token = tokensFromUser[address] || tokensFromLists[address]

        if (isTokenArbitrumOneNativeUSDC(address)) {
          // for token search as Arb One native USDC isn't in any lists
          token = ARB_ONE_NATIVE_USDC_TOKEN
        }

        if (isTokenArbitrumSepoliaNativeUSDC(address)) {
          // for token search as Arb One native USDC isn't in any lists
          token = ARB_SEPOLIA_NATIVE_USDC_TOKEN
        }

        if (isTokenArbitrumOneUSDCe(address) && isDepositMode && isOrbitChain) {
          // hide USDC.e if depositing to an Orbit chain
          return false
        }

        // If the token on the list is used as a custom fee token, we remove the duplicate
        if (
          nativeCurrency.isCustom &&
          addressesEqual(address, nativeCurrency.address)
        ) {
          return false
        }

        // Which tokens to show while the search is not active
        if (!tokenSearch) {
          // Always show native currency
          if (address === NATIVE_CURRENCY_IDENTIFIER) {
            return true
          }

          // Always show official ARB token except from or to Orbit chain
          if (token?.listIds.has(SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID)) {
            return !isOrbitChain
          }

          const balance = getBalance(address)
          // Only show tokens with a balance greater than zero
          return balance && balance.gt(0)
        }

        if (address === NATIVE_CURRENCY_IDENTIFIER) {
          return `${nativeCurrency.name}${nativeCurrency.symbol}`
            .toLowerCase()
            .includes(tokenSearch)
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
        // Pin native currency to top
        if (address1 === NATIVE_CURRENCY_IDENTIFIER) {
          return -1
        }

        // Pin native currency to top
        if (address2 === NATIVE_CURRENCY_IDENTIFIER) {
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
  }, [
    newToken,
    tokensFromUser,
    tokensFromLists,
    isDepositMode,
    isArbitrumOne,
    isArbitrumSepolia,
    isParentChainArbitrumOne,
    isParentChainArbitrumSepolia,
    isOrbitChain,
    getBalance,
    nativeCurrency
  ])

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

  const onSearchInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setErrorMessage('')
      setNewToken(event.target.value)
    },
    []
  )

  const rowRenderer = useCallback(
    (virtualizedProps: ListRowProps) => {
      const address = tokensToShow[virtualizedProps.index]
      let token: ERC20BridgeToken | null = null

      if (
        isTokenArbitrumOneNativeUSDC(address) ||
        isTokenArbitrumSepoliaNativeUSDC(address)
      ) {
        token = usdcToken
      } else if (address) {
        token = tokensFromLists[address] || tokensFromUser[address] || null
      }

      if (address === NATIVE_CURRENCY_IDENTIFIER) {
        return (
          <TokenRow
            key="TokenRowNativeCurrency"
            onTokenSelected={onTokenSelected}
            token={null}
          />
        )
      }

      return (
        <TokenRow
          key={address}
          style={virtualizedProps.style}
          onTokenSelected={onTokenSelected}
          token={token}
        />
      )
    },
    [tokensToShow, tokensFromLists, tokensFromUser, onTokenSelected, usdcToken]
  )

  const AddButton = useMemo(
    () => (
      <Button
        type="submit"
        variant="secondary"
        loading={isAddingToken}
        loadingProps={{ loaderColor: '#999999' /** text-gray-6 */ }}
        disabled={!isAddress(newToken)}
        className="border border-gray-dark py-1"
        aria-label="Add New Token"
      >
        Add
      </Button>
    ),
    [isAddingToken, newToken]
  )

  return (
    <SearchPanelTable
      searchInputPlaceholder="Search by token name, symbol, or address"
      searchInputValue={newToken}
      searchInputOnChange={onSearchInputChange}
      errorMessage={errorMessage}
      onSubmit={addNewToken}
      SearchInputButton={AddButton}
      dataCy="tokenSearchList"
      isDialog={false}
    >
      <AutoSizer>
        {({ height, width }) => (
          <List
            width={width - 2}
            height={height}
            rowCount={tokensToShow.length}
            rowHeight={84}
            rowRenderer={rowRenderer}
          />
        )}
      </AutoSizer>
    </SearchPanelTable>
  )
}

export function TokenSearch({
  className,
  close
}: {
  className?: string
  close: () => void
}) {
  const { setAmount2 } = useSetInputAmount()
  const {
    app: {
      arbTokenBridge: { token, bridgeTokens }
    }
  } = useAppState()
  const [, setSelectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { childChain, parentChainProvider } = useNetworksRelationship(networks)

  const { isValidating: isFetchingTokenLists } = useTokenLists(childChain.id) // to show a small loader while token-lists are loading when search panel opens

  async function selectToken(_token: ERC20BridgeToken | null) {
    close()

    if (_token === null) {
      setSelectedToken(null)
      return
    }

    if (!_token.address) {
      return
    }

    if (isTokenNativeUSDC(_token.address)) {
      // not supported
      setAmount2('')
    }

    try {
      if (typeof bridgeTokens === 'undefined') {
        return
      }

      const isL2NativeUSDC =
        isTokenArbitrumOneNativeUSDC(_token.address) ||
        isTokenArbitrumSepoliaNativeUSDC(_token.address)

      if (isL2NativeUSDC) {
        setSelectedToken(_token.address)
        return
      }

      // Token not added to the bridge, so we'll handle importing it
      if (typeof bridgeTokens[_token.address] === 'undefined') {
        setSelectedToken(_token.address)
        return
      }

      const data = await fetchErc20Data({
        address: _token.address,
        provider: parentChainProvider
      })

      if (data) {
        token.updateTokenData(_token.address)
        setSelectedToken(_token.address)
      }
    } catch (error: any) {
      console.warn(error)

      if (error.name === 'TokenDisabledError') {
        warningToast('This token is currently paused in the bridge')
      }
    }
  }

  return (
    <SearchPanel>
      <SearchPanel.MainPage className={className}>
        <SearchPanel.PageTitle title="Select Token">
          <SearchPanel.CloseButton onClick={close} />
        </SearchPanel.PageTitle>
        <TokensPanel onTokenSelected={selectToken} />
        <div className="flex justify-end pt-4">
          {isFetchingTokenLists ? (
            <SearchPanel.LoaderWithMessage loadingMessage="Fetching Tokens..." />
          ) : (
            <SearchPanel.MainPageCTA>
              Manage token lists
            </SearchPanel.MainPageCTA>
          )}
        </div>
      </SearchPanel.MainPage>
      <SearchPanel.SecondaryPage className={className}>
        <TokenListsPanel closePanel={close} />
        <SearchPanel.SecondaryPageCTA>
          Back to Select Token
        </SearchPanel.SecondaryPageCTA>
      </SearchPanel.SecondaryPage>
    </SearchPanel>
  )
}
