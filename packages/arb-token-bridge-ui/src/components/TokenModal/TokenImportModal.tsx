import {
  useState,
  useEffect,
  useMemo,
  MouseEventHandler,
  useCallback
} from 'react'
import Loader from 'react-loader-spinner'
import Tippy from '@tippyjs/react'
import { useLatest } from 'react-use'
import { ERC20BridgeToken } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { Modal } from '../common/Modal'
import {
  useTokensFromLists,
  useTokensFromUser,
  toERC20BridgeToken
} from './TokenModalUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

function ModalFooter({
  hideCancel = false,
  actionButtonContent,
  onCancel,
  onAction
}: {
  actionButtonContent: JSX.Element | string | null
  hideCancel: boolean
  onCancel: MouseEventHandler<HTMLButtonElement>
  onAction: MouseEventHandler<HTMLButtonElement>
}) {
  return (
    <div
      className="-mx-6 flex justify-end space-x-2 py-4 pr-6"
      style={{ backgroundColor: '#F4F4F4' }}
    >
      {!hideCancel && (
        <button
          className="focus:outline-none inline-flex w-1/2 items-center justify-center rounded-xl px-4 text-base font-medium transition duration-200 hover:opacity-75 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
          style={{ color: '#11365E' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
      <button
        className="bg-dark-cyan focus:outline-none inline-flex w-1/2 justify-center rounded-xl border border-transparent px-4 py-3 text-base font-medium text-white transition duration-200 hover:opacity-75 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
        style={{ backgroundColor: '#11365E' }}
        onClick={onAction}
      >
        {actionButtonContent}
      </button>
    </div>
  )
}

enum ImportStatus {
  LOADING,
  KNOWN,
  KNOWN_UNIMPORTED,
  UNKNOWN,
  ERROR
}

type TokenListSearchResult =
  | {
      found: false
    }
  | {
      found: true
      token: ERC20BridgeToken
      status: ImportStatus
    }

export function TokenImportModal({
  isOpen,
  setIsOpen,
  address
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  address: string
}): JSX.Element {
  const {
    app: {
      arbTokenBridge: { bridgeTokens, token },
      selectedToken
    }
  } = useAppState()
  const {
    l1: { network: l1Network }
  } = useNetworksAndSigners()
  const actions = useActions()

  const tokensFromUser = useTokensFromUser()
  const latestTokensFromUser = useLatest(tokensFromUser)

  const tokensFromLists = useTokensFromLists()
  const latestTokensFromLists = useLatest(tokensFromLists)

  const latestBridgeTokens = useLatest(bridgeTokens)

  const [status, setStatus] = useState<ImportStatus>(ImportStatus.LOADING)
  const [isImportingToken, setIsImportingToken] = useState<boolean>(false)
  const [tokenToImport, setTokenToImport] = useState<ERC20BridgeToken>()

  const modalTitle = useMemo(() => {
    switch (status) {
      case ImportStatus.LOADING:
        return 'Loading token'
      case ImportStatus.KNOWN:
      case ImportStatus.KNOWN_UNIMPORTED:
        return 'Import known token'
      case ImportStatus.UNKNOWN:
        return (
          <span>
            Import <span style={{ color: '#CD0000' }}>unknown</span> token{' '}
          </span>
        )
      case ImportStatus.ERROR:
        return 'Invalid token address'
    }
  }, [status])

  const isLoadingBridgeTokens = useMemo(() => {
    if (typeof bridgeTokens === 'undefined') {
      return true
    }

    if (Object.keys(bridgeTokens).length === 0) {
      return true
    }

    return false
  }, [bridgeTokens])

  const getL1TokenData = useCallback(
    async (eitherL1OrL2Address: string) => {
      if (typeof token === 'undefined') {
        return
      }

      const addressOnL1 = await token.getL1ERC20Address(eitherL1OrL2Address)

      if (addressOnL1) {
        return token.getL1TokenData(addressOnL1)
      } else {
        return token.getL1TokenData(eitherL1OrL2Address)
      }
    },
    [token]
  )

  const searchForTokenInLists = useCallback(
    (erc20L1Address: string): TokenListSearchResult => {
      // We found the token in an imported list
      if (typeof latestBridgeTokens.current[erc20L1Address] !== 'undefined') {
        return {
          found: true,
          token: latestBridgeTokens.current[erc20L1Address]!,
          status: ImportStatus.KNOWN
        }
      }

      const tokens = {
        ...latestTokensFromLists.current,
        ...latestTokensFromUser.current
      }

      // We found the token in an unimported list
      if (typeof tokens[erc20L1Address] !== 'undefined') {
        return {
          found: true,
          token: tokens[erc20L1Address],
          status: ImportStatus.KNOWN_UNIMPORTED
        }
      }

      return { found: false }
    },
    [latestBridgeTokens, latestTokensFromLists, latestTokensFromUser]
  )

  const selectToken = useCallback(
    async (_token: ERC20BridgeToken) => {
      await token.updateTokenData(_token.address)
      actions.app.setSelectedToken(_token)
    },
    [token, actions]
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (isLoadingBridgeTokens) {
      return
    }

    const searchResult1 = searchForTokenInLists(address)

    if (searchResult1.found) {
      setStatus(searchResult1.status)
      setTokenToImport(searchResult1.token)

      return
    }

    // Can't find the address provided, so we look further
    getL1TokenData(address)
      .then(data => {
        if (data) {
          const addressOnL1 = data.contract.address.toLowerCase()
          const searchResult2 = searchForTokenInLists(addressOnL1)

          if (searchResult2.found) {
            // The address provided was an L2 address, and we found the corresponding L1 address within our lists
            setStatus(searchResult2.status)
            setTokenToImport(searchResult2.token)
          } else {
            // We couldn't find the address within our lists
            setStatus(ImportStatus.UNKNOWN)
            setTokenToImport(toERC20BridgeToken(data))
          }
        }
      })
      .catch(() => {
        setStatus(ImportStatus.ERROR)
      })
  }, [
    isOpen,
    isLoadingBridgeTokens,
    address,
    bridgeTokens,
    searchForTokenInLists,
    getL1TokenData
  ])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const foundToken = tokensFromUser[address]

    if (typeof foundToken === 'undefined') {
      return
    }

    // Listen for the token to be added to the bridge so we can automatically select it
    if (foundToken.address !== selectedToken?.address) {
      setIsOpen(false)
      selectToken(foundToken)
    }
  }, [isOpen, tokensFromUser, address, selectedToken, selectToken, setIsOpen])

  async function storeNewToken(newToken: string) {
    return token.add(newToken).catch((ex: Error) => {
      setStatus(ImportStatus.ERROR)

      if (ex.name === 'TokenDisabledError') {
        alert('This token is currently paused in the bridge')
      }
    })
  }

  function handleTokenImport() {
    if (isImportingToken) {
      return
    }

    setIsImportingToken(true)

    if (typeof bridgeTokens[address] !== 'undefined') {
      // Token is already added to the bridge
      setIsOpen(false)
      selectToken(tokenToImport!)
    } else {
      // Token is not added to the bridge, so we add it
      storeNewToken(address).catch(() => {
        setStatus(ImportStatus.ERROR)
      })
    }
  }

  if (status === ImportStatus.LOADING) {
    return (
      <Modal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title={modalTitle}
        hideButton
      >
        <div className="flex h-32 items-center justify-center">
          <Loader type="Oval" color="#000" height={32} width={32} />
        </div>
      </Modal>
    )
  }

  if (status === ImportStatus.ERROR) {
    return (
      <Modal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title={modalTitle}
        hideButton
      >
        <div className="-mb-6 flex flex-col space-y-2">
          <div>
            <div className="flex flex-col">
              <span>
                Whoops, looks like this token address is invalid.
                <br />
                Try asking the token team to update their link.
              </span>
            </div>
            <div className="flex w-full justify-center py-4">
              <img src="/images/grumpy-cat.jpg" alt="Grumpy cat" />
            </div>
          </div>
          <ModalFooter
            hideCancel={true}
            actionButtonContent="Close"
            onCancel={() => setIsOpen(false)}
            onAction={() => setIsOpen(false)}
          />
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={modalTitle} hideButton>
      <div className="-mb-6 flex flex-col space-y-2">
        {status === ImportStatus.KNOWN && (
          <span>This token is on an imported token list as:</span>
        )}
        {status === ImportStatus.KNOWN_UNIMPORTED && (
          <span>
            This token hasn't been imported yet but appears on a token list. Are
            you sure you want to import it?
          </span>
        )}

        {status === ImportStatus.UNKNOWN && (
          <div className="flex flex-col items-center space-y-3 sm:flex-row sm:space-x-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10Z"
                fill="#CD0000"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 12C9.44771 12 9 11.5523 9 11L9 5C9 4.44772 9.44772 4 10 4C10.5523 4 11 4.44772 11 5L11 11C11 11.5523 10.5523 12 10 12Z"
                fill="#CD0000"
              />
              <path
                d="M8.5 14.5C8.5 13.6716 9.17157 13 10 13C10.8284 13 11.5 13.6716 11.5 14.5C11.5 15.3284 10.8284 16 10 16C9.17157 16 8.5 15.3284 8.5 14.5Z"
                fill="#CD0000"
              />
            </svg>
            <div className="flex flex-col">
              <span>
                This token isn't found on an active token list.
                <br />
                Make sure you trust the source that led you here.
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center py-4">
          {tokenToImport?.logoURI && (
            <img
              style={{ width: '25px', height: '25px' }}
              className="mb-2 rounded-full"
              src={tokenToImport?.logoURI}
              alt={`${tokenToImport?.name} logo`}
            />
          )}
          <span className="text-xl font-bold">{tokenToImport?.symbol}</span>
          <span className="mt-0 mb-4">{tokenToImport?.name}</span>
          <a
            href={`${l1Network?.explorerUrl}/token/${tokenToImport?.address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1366C1' }}
            className="break-all underline"
          >
            {tokenToImport?.address}
          </a>

          {status === ImportStatus.UNKNOWN && (
            <div className="flex w-full justify-start pt-4">
              <Tippy
                theme="light"
                content={
                  <div>
                    This token address doesn't exist in any of the token lists
                    we have. This doesn't mean it's not good, it just means{' '}
                    <span className="font-bold">proceed with caution.</span>
                    <br />
                    <br />
                    It's easy to impersonate the name of any token, including
                    ETH. Make sure you trust the source it came from. If it's a
                    popular token, there's a good chance we have it on our list.
                    If it's a smaller or newer token, it's reasonable to believe
                    we might not have it.
                  </div>
                }
              >
                <span className="cursor-pointer underline">I'm confused</span>
              </Tippy>
            </div>
          )}
        </div>
        <ModalFooter
          hideCancel={isImportingToken}
          actionButtonContent={
            isImportingToken ? (
              <Loader type="Oval" color="#fff" height={20} width={20} />
            ) : (
              <span>Import token</span>
            )
          }
          onCancel={() => setIsOpen(false)}
          onAction={handleTokenImport}
        />
      </div>
    </Modal>
  )
}
