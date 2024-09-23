import React, { FormEventHandler, useMemo, useState, useCallback } from 'react'
import { isAddress } from 'ethers/lib/utils'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { AutoSizer, List, ListRowProps } from 'react-virtualized'
import { twMerge } from 'tailwind-merge'

import { useActions, useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  BridgeTokenList,
  addBridgeTokenListToBridge,
  SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID
} from '../../util/TokenListUtils'
import {
  fetchErc20Data,
  erc20DataToErc20BridgeToken,
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneUSDCe,
  getL2ERC20Address,
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
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'
import { useAccountType } from '../../hooks/useAccountType'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { SearchPanelTable } from '../common/SearchPanel/SearchPanelTable'
import { SearchPanel } from '../common/SearchPanel/SearchPanel'
import { TokenRow } from './TokenRow'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useTransferDisabledDialogStore } from './TransferDisabledDialog'
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils'
import { useTokenFromSearchParams } from './TransferPanelUtils'
import { Switch } from '../common/atoms/Switch'
import { isTeleportEnabledToken } from '../../util/TokenTeleportEnabledUtils'
import { useBalances } from '../../hooks/useBalances'
import { useSetInputAmount } from '../../hooks/TransferPanel/useSetInputAmount'

export const ARB_ONE_NATIVE_USDC_TOKEN = {
  ...ArbOneNativeUSDC,
  listIds: new Set<number>(),
  type: TokenType.ERC20,
  // the address field is for L1 address but native USDC does not have an L1 address
  // the L2 address is used instead to avoid errors
  address: CommonAddress.ArbitrumOne.USDC,
  l2Address: CommonAddress.ArbitrumOne.USDC
}

export const ARB_SEPOLIA_NATIVE_USDC_TOKEN = {
  ...ArbOneNativeUSDC,
  listIds: new Set<number>(),
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
          address.toLowerCase() === nativeCurrency.address.toLowerCase()
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
    isOrbitChain,
    isParentChainArbitrumOne,
    isParentChainArbitrumSepolia,
    getBalance,
    nativeCurrency
  ])

  const storeNewToken = async () => {
    if (!walletAddress) {
      return
    }

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

      if (isTokenArbitrumOneNativeUSDC(address)) {
        token = ARB_ONE_NATIVE_USDC_TOKEN
      } else if (isTokenArbitrumSepoliaNativeUSDC(address)) {
        token = ARB_SEPOLIA_NATIVE_USDC_TOKEN
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
    [tokensToShow, tokensFromLists, tokensFromUser, onTokenSelected]
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
  const { address: walletAddress } = useAccount()
  const { setAmount2 } = useSetInputAmount()
  const {
    app: {
      arbTokenBridge: { token, bridgeTokens }
    }
  } = useAppState()
  const {
    app: { setSelectedToken }
  } = useActions()
  const [networks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChain,
    parentChainProvider,
    isTeleportMode
  } = useNetworksRelationship(networks)
  const { updateUSDCBalances } = useUpdateUSDCBalances({ walletAddress })
  const { isLoading: isLoadingAccountType } = useAccountType()
  const { openDialog: openTransferDisabledDialog } =
    useTransferDisabledDialogStore()
  const { setTokenQueryParam } = useTokenFromSearchParams()

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
      // Native USDC on L2 won't have a corresponding L1 address
      const isL2NativeUSDC =
        isTokenArbitrumOneNativeUSDC(_token.address) ||
        isTokenArbitrumSepoliaNativeUSDC(_token.address)

      if (isL2NativeUSDC) {
        if (isLoadingAccountType) {
          return
        }

        await updateUSDCBalances()

        // if an Orbit chain is selected we need to fetch its USDC address
        let childChainUsdcAddress
        try {
          childChainUsdcAddress = isNetwork(childChain.id).isOrbitChain
            ? (
                await getL2ERC20Address({
                  erc20L1Address: _token.address,
                  l1Provider: parentChainProvider,
                  l2Provider: childChainProvider
                })
              ).toLowerCase()
            : undefined
        } catch {
          // could be never bridged before
        }

        setSelectedToken({
          name: 'USD Coin',
          type: TokenType.ERC20,
          symbol: 'USDC',
          address: _token.address,
          l2Address: childChainUsdcAddress,
          decimals: 6,
          listIds: new Set()
        })
        return
      }

      if (typeof bridgeTokens === 'undefined') {
        return
      }

      // Token not added to the bridge, so we'll handle importing it
      if (typeof bridgeTokens[_token.address] === 'undefined') {
        setTokenQueryParam(_token.address)
        return
      }

      if (!walletAddress) {
        return
      }

      const data = await fetchErc20Data({
        address: _token.address,
        provider: parentChainProvider
      })

      if (data) {
        token.updateTokenData(_token.address)
        setSelectedToken({
          ...erc20DataToErc20BridgeToken(data),
          l2Address: _token.l2Address
        })
      }

      if (isTransferDisabledToken(_token.address, childChain.id)) {
        openTransferDisabledDialog()
        return
      }

      if (
        isTeleportMode &&
        !isTeleportEnabledToken(_token.address, parentChain.id, childChain.id)
      ) {
        openTransferDisabledDialog()
        return
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
