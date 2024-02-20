import React, { FormEventHandler, useMemo, useState, useCallback } from 'react'
import { isAddress } from 'ethers/lib/utils'
import { constants } from 'ethers'

import Image from 'next/image'
import { useAccount } from 'wagmi'
import { AutoSizer, List, ListRowProps } from 'react-virtualized'

import { useActions, useAppState } from '../../state'
import {
  fetchErc20Data,
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  erc20DataToCrossChainTokenInfo
} from '../../util/TokenUtils'
import { Button } from '../common/Button'
import { useBalance } from '../../hooks/useBalance'
import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types'
import { warningToast } from '../common/atoms/Toast'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { ArbOneNativeUSDC } from '../../util/L2NativeUtils'
import { ChainId, isNetwork } from '../../util/networks'
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'
import { useAccountType } from '../../hooks/useAccountType'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { SearchPanelTable } from '../common/SearchPanel/SearchPanelTable'
import { SearchPanel } from '../common/SearchPanel/SearchPanel'
import { TokenRow } from './TokenRow'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useTransferDisabledDialogStore } from './TransferDisabledDialog'
import { isWithdrawOnlyToken } from '../../util/WithdrawOnlyUtils'
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils'
import { useTokenFromSearchParams } from './TransferPanelUtils'
import {
  BRIDGE_TOKEN_LISTS,
  BridgeTokenList,
  CrossChainTokenInfo,
  useTokenListsStore
} from '../../features/tokenLists/useTokenListsStore'
import { useTokens } from '../../features/tokenLists/hooks/useTokens'

const ARB_ONE_NATIVE_USDC_TOKEN = {
  ...ArbOneNativeUSDC,
  listIds: new Set<number>(),
  type: TokenType.ERC20,
  // the address field is for L1 address but native USDC does not have an L1 address
  // the L2 address is used instead to avoid errors
  address: CommonAddress.ArbitrumOne.USDC,
  bridgeInfo: {
    [ChainId.Ethereum]: CommonAddress.ArbitrumOne.USDC
  }
}

// TODO: update this and move
const ARB_SEPOLIA_NATIVE_USDC_TOKEN = {
  ...ArbOneNativeUSDC,
  listIds: new Set<number>(),
  type: TokenType.ERC20,
  address: CommonAddress.ArbitrumSepolia.USDC,
  bridgeInfo: {
    [ChainId.ArbitrumSepolia]: CommonAddress.ArbitrumSepolia.USDC
  }
}

function TokenListsPanel() {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)
  const { token } = arbTokenBridge
  const { tokenLists } = useTokenListsStore()

  const listsToShow: BridgeTokenList[] = useMemo(() => {
    return BRIDGE_TOKEN_LISTS.filter(tokenList => {
      return tokenList.chainIds.includes(childChain.id)
    })
  }, [childChain.id])

  const toggleTokenList = (
    bridgeTokenList: BridgeTokenList,
    isActive: boolean
  ) => {
    if (isActive) {
      token.removeTokensFromList(bridgeTokenList.id)
    } else {
      token.addTokensFromList(bridgeTokenList.id)
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-md border border-gray-300 p-6">
      {listsToShow.map(tokenList => {
        const isActive = tokenLists.has(tokenList.id)

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

const NATIVE_CURRENCY_IDENTIFIER = 'native_currency'

function TokensPanel({
  onTokenSelected
}: {
  onTokenSelected: (token: ERC20BridgeToken | null) => void
}): JSX.Element {
  const { address: walletAddress } = useAccount()
  const {
    app: {
      arbTokenBridge: { token }
    }
  } = useAppState()
  const [networks] = useNetworks()
  const { sourceTokens } = useTokens({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })
  const { childChain, childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({ provider: parentChainProvider, walletAddress })
  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({ provider: childChainProvider, walletAddress })

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const { isArbitrumOne, isArbitrumSepolia, isOrbitChain } = isNetwork(
    childChain.id
  )
  const [newToken, setNewToken] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)

  const getBalance = useCallback(
    (address: string) => {
      if (address === NATIVE_CURRENCY_IDENTIFIER) {
        if (nativeCurrency.isCustom) {
          return isDepositMode
            ? erc20L1Balances?.[nativeCurrency.address]
            : ethL2Balance
        }

        return isDepositMode ? ethL1Balance : ethL2Balance
      }

      if (isDepositMode) {
        return erc20L1Balances?.[address.toLowerCase()]
      }

      if (
        isTokenArbitrumOneNativeUSDC(address) ||
        isTokenArbitrumSepoliaNativeUSDC(address)
      ) {
        return erc20L2Balances?.[address.toLowerCase()]
      }

      return erc20L2Balances?.[address.toLowerCase()] ?? constants.Zero
    },
    [
      nativeCurrency,
      erc20L1Balances,
      erc20L2Balances,
      ethL1Balance,
      ethL2Balance,
      isDepositMode
    ]
  )

  const tokensToShow = useMemo(() => {
    const tokenSearch = newToken.trim().toLowerCase()
    const tokenAddresses = Object.keys(sourceTokens)
    if (!isDepositMode) {
      if (isArbitrumOne) {
        tokenAddresses.push(CommonAddress.ArbitrumOne.USDC)
      }
      if (isArbitrumSepolia) {
        tokenAddresses.push(CommonAddress.ArbitrumSepolia.USDC)
      }
    }
    const tokens = [
      NATIVE_CURRENCY_IDENTIFIER,
      // Deduplicate addresses
      ...tokenAddresses
    ]
    if (Object.keys(sourceTokens).length === 0) {
      return tokens
    }

    return tokens
      .filter(address => {
        // Derive the token object from the address string
        let token = sourceTokens[address]

        if (isTokenArbitrumOneNativeUSDC(address)) {
          // for token search as Arb One native USDC isn't in any lists
          token = ARB_ONE_NATIVE_USDC_TOKEN
        }

        if (isTokenArbitrumSepoliaNativeUSDC(address)) {
          // for token search as Arb One native USDC isn't in any lists
          token = ARB_SEPOLIA_NATIVE_USDC_TOKEN
        }

        // If the token on the list is used as a custom fee token, we remove the duplicate
        if (nativeCurrency.isCustom && address !== NATIVE_CURRENCY_IDENTIFIER) {
          return address.toLowerCase() !== nativeCurrency.address
        }

        // Which tokens to show while the search is not active
        if (!tokenSearch) {
          // Always show native currency
          if (address === NATIVE_CURRENCY_IDENTIFIER) {
            return true
          }

          // Always show official ARB token except from or to Orbit chain
          // if (token?.listIds.has(SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID)) {
          //   return !isOrbitChain
          // }

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

        const { name, symbol, address: tokenAddress } = token
        const l2Address = token.bridgeInfo[childChain.id]

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
    sourceTokens,
    isDepositMode,
    isArbitrumOne,
    isArbitrumSepolia,
    nativeCurrency,
    childChain.id,
    getBalance
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
      let token: CrossChainTokenInfo | null = null

      if (isTokenArbitrumOneNativeUSDC(address)) {
        token = ARB_ONE_NATIVE_USDC_TOKEN
      } else if (isTokenArbitrumSepoliaNativeUSDC(address)) {
        token = ARB_SEPOLIA_NATIVE_USDC_TOKEN
      } else if (address) {
        token = sourceTokens[address] || null
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
    [tokensToShow, onTokenSelected, sourceTokens]
  )

  const AddButton = useMemo(
    () => (
      <Button
        type="submit"
        variant="secondary"
        loading={isAddingToken}
        loadingProps={{ loaderColor: '#999999' /** text-gray-6 */ }}
        disabled={!isAddress(newToken)}
        className="border border-dark py-1 disabled:border disabled:border-current disabled:bg-white disabled:text-gray-4"
        aria-label="Add New Token"
      >
        Add
      </Button>
    ),
    [isAddingToken, newToken]
  )

  return (
    <SearchPanelTable
      searchInputPlaceholder={`Search by token name, symbol, or address`}
      searchInputValue={newToken}
      onSearchInputChange={onSearchInputChange}
      errorMessage={errorMessage}
      onSubmit={addNewToken}
      SearchInputButton={AddButton}
      dataCy="tokenSearchList"
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

export function TokenSearch({ close }: { close: () => void }) {
  const { address: walletAddress } = useAccount()
  const {
    app: {
      arbTokenBridge: { token }
    }
  } = useAppState()
  const {
    app: { setSelectedToken }
  } = useActions()
  const [networks] = useNetworks()
  const { childChain, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const { updateUSDCBalances } = useUpdateUSDCBalances({ walletAddress })
  const { isLoading: isLoadingAccountType } = useAccountType()
  const { openDialog: openTransferDisabledDialog } =
    useTransferDisabledDialogStore()
  const { setTokenQueryParam } = useTokenFromSearchParams()
  const { tokenLists } = useTokenListsStore()
  const { sourceTokens } = useTokens({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })

  async function selectToken(_token: CrossChainTokenInfo | null) {
    close()

    if (_token === null) {
      setSelectedToken(null)
      return
    }

    if (!_token.address) {
      return
    }

    try {
      // Native USDC on L2 won't have a corresponding L1 address
      const isNativeUSDC =
        isTokenArbitrumOneNativeUSDC(_token.address) ||
        isTokenArbitrumSepoliaNativeUSDC(_token.address)

      if (isNativeUSDC) {
        if (isLoadingAccountType) {
          return
        }

        updateUSDCBalances(_token.address)
        setSelectedToken({
          name: 'USD Coin',
          type: TokenType.ERC20,
          symbol: 'USDC',
          address: _token.address,
          decimals: 6,
          listIds: new Set()
        })
        return
      }

      // Token not added to the bridge, so we'll handle importing it
      if (typeof sourceTokens[_token.address.toLowerCase()] === 'undefined') {
        setTokenQueryParam(_token.address)
        return
      }

      if (!walletAddress) {
        return
      }

      // do not allow import of withdraw-only tokens at deposit mode
      if (isDepositMode && isWithdrawOnlyToken(_token.address, childChain.id)) {
        openTransferDisabledDialog()
        return
      }

      if (isTransferDisabledToken(_token.address, childChain.id)) {
        openTransferDisabledDialog()
        return
      }

      if (sourceTokens[_token.address.toLowerCase()]) {
        setSelectedToken(_token)
        return
      }

      const data = await fetchErc20Data({
        address: _token.address,
        provider: networks.sourceChainProvider
      })

      if (data) {
        token.updateTokenData(_token.address)
        // TODO: find bridgeInfo, how?
        setSelectedToken(
          erc20DataToCrossChainTokenInfo(data, networks.sourceChain.id)
        )
      }
    } catch (error: any) {
      console.warn(error)

      if (error.name === 'TokenDisabledError') {
        warningToast('This token is currently paused in the bridge')
      }
    }
  }

  return (
    <SearchPanel
      showCloseButton={false}
      close={close}
      SearchPanelSecondaryPage={<TokenListsPanel />}
      mainPageTitle="Select Token"
      secondPageTitle="Token Lists"
      isLoading={tokenLists.size === 0}
      loadingMessage="Fetching Tokens..."
      bottomRightCtaText="Manage token lists"
    >
      <TokensPanel onTokenSelected={selectToken} />
    </SearchPanel>
  )
}
