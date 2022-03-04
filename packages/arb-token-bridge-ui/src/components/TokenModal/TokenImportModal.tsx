import { L1TokenData } from 'arb-ts'
import {
  useState,
  useEffect,
  useMemo,
  MouseEventHandler,
  useContext
} from 'react'
import Loader from 'react-loader-spinner'
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
          className="w-full inline-flex items-center justify-center rounded-xl px-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm hover:opacity-75 transition duration-200"
          style={{ color: '#11365E' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
      <button
        className="inline-flex justify-center rounded-xl border border-transparent px-4 py-3 bg-dark-cyan text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm hover:opacity-75 transition duration-200"
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
            setTokenToImport(toERC20BridgeToken(data))
            setStatus(ImportStatus.UNKNOWN)
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

  function getL1TokenData(_address: string) {
    return bridge?.l1Bridge.getL1TokenData(_address)
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
          <div className="py-4">
            <div className="flex flex-col">
              <span>
                Whoops, looks like this token address is invalid.
                <br />
                Try asking the token team to update their link.
              </span>
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
          <div className="flex flex-row items-center">
            {/* TODO: add warning icon here */}
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
              src={tokenToImport!.logoURI}
              alt={`${tokenToImport!.name} logo`}
            />
          )}
          <span className="text-xl font-bold">{tokenToImport!.symbol}</span>
          <span className="mt-0 mb-4">{tokenToImport!.name}</span>
          <a
            href={`https://etherscan.io/token/${tokenToImport!.address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1366C1' }}
            className="underline"
          >
            {tokenToImport!.address}
          </a>
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
