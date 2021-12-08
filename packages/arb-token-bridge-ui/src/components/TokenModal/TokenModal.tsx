import React, {
  FormEventHandler,
  useContext,
  useMemo,
  useState,
  useCallback
} from 'react'

import axios from 'axios'
import { BigNumber, constants } from 'ethers'
import { isAddress, formatUnits } from 'ethers/lib/utils'
import Loader from 'react-loader-spinner'
import { BridgeToken } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { BRIDGE_TOKEN_LISTS, BridgeTokenList } from '../../tokenLists'
import { resolveTokenImg } from '../../util'
import { BridgeContext } from '../App/App'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import TokenBlacklistedDialog from './TokenBlacklistedDialog'
import TokenConfirmationDialog from './TokenConfirmationDialog'

interface TokenRowProps {
  address: string | null
  balance: BigNumber | null | undefined
  onTokenSelected: () => void
  toggleCurrentPannel: () => void
}
interface TokenListViewProps {
  toggleCurrentPannel: () => void
}

enum Pannel {
  TOKENS,
  LISTS
}

const listIdsToNames: { [key: string] : string } = {}
BRIDGE_TOKEN_LISTS.forEach(bridgeTokenList => {
  listIdsToNames[bridgeTokenList.id] = bridgeTokenList.name
})
const TokenRow = ({
  address,
  balance,
  onTokenSelected,
  toggleCurrentPannel
}: TokenRowProps): JSX.Element => {
  const {
    app: {
      networkID,
      arbTokenBridge: {
        bridgeTokens,
        token: { updateTokenData }
      }
    }
  } = useAppState()
  const actions = useActions()

  // TODO should I check in bridgeTokens or in token-bridge-sdk/token-list
  const token = useMemo(
    () => (address ? bridgeTokens[address] : null),
    [address, bridgeTokens]
  )

  const tokenName = useMemo(() => {
    if (address === null) {
      return 'Ethereum'
    }
    return token ? token.name : address
  }, [token, address])

  const tokenSymbol = useMemo(() => {
    if (address === null) {
      return 'Eth'
    }
    return token ? token.symbol : ''
  }, [token, address])

  const tokenLogo = useMemo<string | undefined>(() => {
    if (!address) {
      return 'https://ethereum.org/static/4b5288012dc4b32ae7ff21fccac98de1/31987/eth-diamond-black-gray.png'
    }
    if (networkID === null) {
      return undefined
    }
    const logo = bridgeTokens[address]?.logoURI
    if (logo) {
      return resolveTokenImg(logo)
    }
    return undefined
  }, [address, networkID, bridgeTokens])

  function selectToken() {
    if (token) {
      updateTokenData(token.address)
    }
    actions.app.setSelectedToken(token || null)
    onTokenSelected()
  }

  const source = (() => {
    if (token === null || token === undefined) return ''
    if (token === undefined) return ''
    if (!token.listID) {
      return 'user-added'
    }

    return listIdsToNames[token.listID]
  })()

  return (
    <button
      onClick={selectToken}
      type="button"
      className="flex items-center justify-between border border-gray-300 rounded-md px-6 py-3 bg-white hover:bg-gray-100"
    >
      <div className="flex items-center">
        {tokenLogo ? (
          <img
            src={tokenLogo}
            alt="logo"
            className="rounded-full w-8 h-8 mr-4"
          />
        ) : (
          <div className="rounded-full w-8 h-8 mr-4 bg-navy" />
        )}

        <p className="text-base leading-6 font-bold text-gray-900">
          {tokenName}
        </p>
        <div className="text-xs leading-9 text-gray-600 self-end m-1.5">
          {' '}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              toggleCurrentPannel()
            }}
          >
            {source}{' '}
          </button>
        </div>
      </div>

      <p className="flex items-center text-base leading-6 font-medium text-gray-900">
        {balance ? (
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
        {tokenSymbol}
      </p>
    </button>
  )
}

export const TokenListBody = () => {
  const {
    app: {
      l2NetworkDetails,
      arbTokenBridge: {
        bridgeTokens,
        token: { removeTokensFromList, addTokensFromList }
      }
    }
  } = useAppState()
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
      axios
        .get(bridgeTokenList.url, {
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        })
        .then(response => {
          return response.data
        })
        .then(tokenListData => {
          addTokensFromList(tokenListData, bridgeTokenList.id)
        })
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
          <div className="flex items-center">
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
export const TokenModalBody = ({
  onTokenSelected,
  toggleCurrentPannel
}: {
  onTokenSelected: () => void
  toggleCurrentPannel: () => void
}): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [blacklistedOpen, setBlacklistedOpen] = useState(false)

  const {
    app: {
      arbTokenBridge: { balances, token, bridgeTokens },
      isDepositMode,
      networkID
    }
  } = useAppState()
  const [newToken, setNewToken] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)
  // const tokensWithPositiveBalance = useMemo(() => {
  //   if (balances.erc20) {
  //     return Object.keys(balances.erc20).filter((addr: string) => {
  //       return addr
  //       if (isDepositMode) {
  //         return !BigNumber.from(balances.erc20[addr]?.balance || 0).isZero()
  //       }
  //       return !BigNumber.from(
  //         balances.erc20[addr]?.arbChainBalance || 0
  //       ).isZero()
  //     })
  //   }
  //   return []
  // }, [balances.erc20, isDepositMode])

  const tokensToShow = useMemo(() => {
    const tokenSearch = newToken.trim().toLowerCase()
    if (bridgeTokens) {
      return Object.keys(bridgeTokens)
        .sort((address1: string, address2: string) => {
          const bal1 = isDepositMode
            ? balances.erc20[address1]?.balance
            : balances.erc20[address1]?.arbChainBalance
          const bal2 = isDepositMode
            ? balances.erc20[address2]?.balance
            : balances.erc20[address2]?.arbChainBalance
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
        .filter((addr: string) => {
          if (!tokenSearch) {
            const l1Bal = balances.erc20[addr]?.balance
            const l2Bal = balances.erc20[addr]?.arbChainBalance

            return !(
              l1Bal &&
              l1Bal.eq(constants.Zero) &&
              l2Bal &&
              l2Bal.eq(constants.Zero)
            )
          }
          const bridgeToken = bridgeTokens[addr]
          if (!bridgeToken) return false
          const { address, l2Address, name, symbol, listID } = bridgeToken
          const listName =
            listID && listIdsToNames[listID] ? listIdsToNames[listID] : ''
          return (address + l2Address + name + symbol + listName)
            .toLowerCase()
            .includes(tokenSearch)
        })
    }
    return []
  }, [bridgeTokens, isDepositMode, newToken, balances])

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
            placeholder="Search by token name, symbol, or address"
            className="text-dark-blue shadow-sm border border-gray-300 rounded-md px-2 w-full h-10"
          />

          {networkID === '4' || networkID === '421611' ? (
            <Button
              variant="white"
              type="submit"
              disabled={newToken === '' || !isAddress(newToken)}
              // className="flex items-center justify-center bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 p-2 min-w-16"
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
          ) : null}
        </div>
      </form>
      <div className="flex flex-col gap-4 overflow-auto max-h-tokenList">
        <TokenRow
          address={null}
          balance={
            isDepositMode ? balances.eth.balance : balances.eth.arbChainBalance
          }
          onTokenSelected={onTokenSelected}
          toggleCurrentPannel={toggleCurrentPannel}
        />
        {tokensToShow.map(erc20Address => (
          <TokenRow
            key={erc20Address}
            address={erc20Address}
            balance={
              isDepositMode
                ? balances.erc20[erc20Address]?.balance
                : balances.erc20[erc20Address]?.arbChainBalance
            }
            onTokenSelected={onTokenSelected}
            toggleCurrentPannel={toggleCurrentPannel}
          />
        ))}
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
