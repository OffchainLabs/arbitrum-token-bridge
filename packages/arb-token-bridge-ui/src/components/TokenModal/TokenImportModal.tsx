import { L1TokenData } from 'arb-ts'
import {
  useState,
  useEffect,
  useMemo,
  MouseEventHandler,
  useContext
} from 'react'
import Loader from 'react-loader-spinner'
import Tippy from '@tippyjs/react'
import { ERC20BridgeToken, TokenType } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { BridgeContext } from '../App/App'
import { Modal } from '../common/Modal'

function useDebouncedState<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function toERC20BridgeToken(data: L1TokenData): ERC20BridgeToken {
  return {
    name: data.name,
    type: TokenType.ERC20,
    symbol: data.symbol,
    allowed: data.allowed,
    address: data.contract.address,
    decimals: data.decimals
  }
}

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
      className="flex justify-end space-x-2 -mx-6 py-4 pr-6"
      style={{ backgroundColor: '#F4F4F4' }}
    >
      {!hideCancel && (
        <button
          className="w-1/2 sm:w-auto inline-flex items-center justify-center rounded-xl px-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm hover:opacity-75 transition duration-200"
          style={{ color: '#11365E' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
      <button
        className="w-1/2 sm:w-auto inline-flex justify-center rounded-xl border border-transparent px-4 py-3 bg-dark-cyan text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm hover:opacity-75 transition duration-200"
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
  UNKNOWN,
  ERROR
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
      l1NetworkDetails,
      arbTokenBridge: { bridgeTokens, token }
    }
  } = useAppState()
  const actions = useActions()
  const bridge = useContext(BridgeContext)

  const [status, setStatus] = useState<ImportStatus>(ImportStatus.LOADING)
  const [isImportingToken, setIsImportingToken] = useState<boolean>(false)
  const [tokenToImport, setTokenToImport] = useState<ERC20BridgeToken>()

  // The `bridgeTokens` state updates a couple of times within a couple of renders.
  // Debouncing it prevents wonky UI updates while finding the token within the list.
  const debouncedBridgeTokens = useDebouncedState(bridgeTokens, 3000)
  const isLoadingTokenList =
    typeof debouncedBridgeTokens === 'undefined' ||
    Object.keys(debouncedBridgeTokens).length === 0

  const modalTitle = useMemo(() => {
    switch (status) {
      case ImportStatus.LOADING:
        return 'Loading token'
      case ImportStatus.KNOWN:
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

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (isLoadingTokenList) {
      return
    }

    // No longer loading, it's time to update status
    if (status === ImportStatus.LOADING) {
      const foundToken = debouncedBridgeTokens[address]

      if (foundToken) {
        // Token can be found in the list
        setTokenToImport(foundToken)
        setStatus(ImportStatus.KNOWN)
      } else {
        // We have to fetch the token info
        getL1TokenData(address)
          ?.then(data => {
            if (data) {
              const addressOnL1 = data.contract.address.toLowerCase()

              if (debouncedBridgeTokens[addressOnL1]) {
                // The address provided was an L2 address, and we found the L1 address in our list
                setStatus(ImportStatus.KNOWN)
                setTokenToImport(debouncedBridgeTokens[addressOnL1])
              } else {
                // We couldn't find the address in our list
                setStatus(ImportStatus.UNKNOWN)
                setTokenToImport(toERC20BridgeToken(data))
              }
            }
          })
          .catch(() => {
            setStatus(ImportStatus.ERROR)
          })
      }
    }

    // The unknown token has now been added to the list, and we can select it
    if (status === ImportStatus.UNKNOWN) {
      const foundToken = debouncedBridgeTokens[address]

      if (foundToken) {
        setIsOpen(false)
        selectToken(foundToken)
      }
    }
  }, [isLoadingTokenList, debouncedBridgeTokens, status])

  async function getL1TokenData(eitherL1OrL2Address: string) {
    const addressOnL1 = await bridge?.getERC20L1Address(eitherL1OrL2Address)

    if (addressOnL1) {
      return bridge?.l1Bridge.getL1TokenData(addressOnL1)
    } else {
      return bridge?.l1Bridge.getL1TokenData(eitherL1OrL2Address)
    }
  }

  async function selectToken(_token: ERC20BridgeToken) {
    await token.updateTokenData(_token.address)
    actions.app.setSelectedToken(_token)
  }

  async function storeNewToken(newToken: string) {
    return token.add(newToken).catch((ex: Error) => {
      setStatus(ImportStatus.ERROR)

      if (ex.name === 'TokenDisabledError') {
        alert('This token is currently paused in the bridge')
      }
    })
  }

  function handletokenToImport() {
    if (isImportingToken) {
      return
    }

    setIsImportingToken(true)

    if (status === ImportStatus.KNOWN) {
      setIsOpen(false)
      selectToken(tokenToImport!)
    } else {
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
        <div className="flex items-center justify-center h-32">
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
        <div className="flex flex-col space-y-2 -mb-6">
          <div>
            <div className="flex flex-col">
              <span>
                Whoops, looks like this token address is invalid.
                <br />
                Try asking the token team to update their link.
              </span>
            </div>
            <div className="w-full flex justify-center py-4">
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
      <div className="flex flex-col space-y-2 -mb-6">
        {status === ImportStatus.KNOWN && (
          <span>This token is on an active token list as:</span>
        )}

        {status === ImportStatus.UNKNOWN && (
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 items-center">
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
              className="rounded-full mb-2"
              src={tokenToImport?.logoURI}
              alt={`${tokenToImport?.name} logo`}
            />
          )}
          <span className="text-xl font-bold">{tokenToImport?.symbol}</span>
          <span className="mt-0 mb-4">{tokenToImport?.name}</span>
          <a
            href={`${l1NetworkDetails?.explorerUrl}/token/${tokenToImport?.address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1366C1' }}
            className="underline break-all"
          >
            {tokenToImport?.address}
          </a>

          {status === ImportStatus.UNKNOWN && (
            <div className="w-full flex justify-start pt-4">
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
                    popular token, we should have it on our list. If it's a
                    smaller or newer token, it's reasonable to believe we might
                    not have it.
                  </div>
                }
              >
                <span className="underline cursor-pointer">I'm confused</span>
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
          onAction={handletokenToImport}
        />
      </div>
    </Modal>
  )
}
