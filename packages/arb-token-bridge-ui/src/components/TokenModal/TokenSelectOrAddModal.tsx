import { useState, useEffect, useMemo, MouseEventHandler } from 'react'
import Loader from 'react-loader-spinner'
import { ERC20BridgeToken } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
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

function TokenSelectOrAddModal({
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

  const [isSelectingToken, setIsSelectingToken] = useState<boolean>(false)
  const [isAddingToken, setIsAddingToken] = useState<boolean>(false)

  // The `bridgeTokens` state updates a couple of times within a couple of renders.
  // Debouncing it prevents wonky UI updates while finding the token within the list.
  const debouncedBridgeTokens = useDebouncedState(bridgeTokens, 1000)
  const isLoadingTokenList = typeof debouncedBridgeTokens === 'undefined'

  const listedToken = useMemo(() => {
    if (isLoadingTokenList) {
      return undefined
    }

    return debouncedBridgeTokens[address]
  }, [isLoadingTokenList, debouncedBridgeTokens])

  const modalTitle = useMemo(() => {
    if (isLoadingTokenList) {
      return 'Loading token...'
    }

    return listedToken ? (
      'Import known token'
    ) : (
      <span>
        Import <span style={{ color: '#CD0000' }}>unknown</span> token{' '}
      </span>
    )
  }, [isLoadingTokenList, listedToken])

  useEffect(() => {
    if (isLoadingTokenList) {
      return
    }

    const foundToken = debouncedBridgeTokens[address]

    // This is the new token added by the user, select it
    if (foundToken && !foundToken.listID) {
      selectToken(foundToken)
    }
  }, [isLoadingTokenList, debouncedBridgeTokens])

  async function selectToken(_token: ERC20BridgeToken) {
    setIsSelectingToken(true)

    await token.updateTokenData(_token.address)
    actions.app.setSelectedToken(_token)

    setIsSelectingToken(false)
  }

  async function storeNewToken(newToken: string) {
    return token.add(newToken).catch((ex: Error) => {
      console.log('Token not found on this network')

      if (ex.name === 'TokenDisabledError') {
        alert('This token is currently paused in the bridge')
      }
    })
  }

  async function addNewToken() {
    if (isAddingToken) {
      return
    }

    setIsAddingToken(true)

    try {
      await storeNewToken(address)
    } catch (ex) {
      console.log(ex)
    } finally {
      setIsOpen(false)
      setIsAddingToken(false)
    }
  }

  if (isLoadingTokenList) {
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

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={modalTitle} hideButton>
      <div className="flex flex-col space-y-2 -mb-6">
        {listedToken ? (
          <>
            <span>This token is on an active token list as:</span>
            <div className="flex flex-col items-center py-6">
              <img
                style={{ width: '25px', height: '25px' }}
                className="rounded-full mb-4"
                src={listedToken.logoURI}
                alt={`${listedToken.name} logo`}
              />
              <span className="text-xl font-bold">{listedToken.symbol}</span>
              <span className="mt-0 mb-4">{listedToken.name}</span>
              <a
                href={`https://etherscan.io/token/${listedToken.address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1366C1' }}
                className="underline"
              >
                {listedToken.address}
              </a>
            </div>
            <ModalFooter
              hideCancel={isSelectingToken}
              actionButtonContent={
                isSelectingToken ? (
                  <Loader type="Oval" color="#fff" height={20} width={20} />
                ) : (
                  <span>Select Token</span>
                )
              }
              onCancel={() => setIsOpen(false)}
              onAction={async () => {
                if (!isSelectingToken) {
                  await selectToken(listedToken)
                  setIsOpen(false)
                }
              }}
            />
          </>
        ) : (
          <>
            <span>
              Token <span className="font-medium">{address}</span> is not on the
              token list.
            </span>
            <span>Would you like to add it?</span>

            <ModalFooter
              hideCancel={isAddingToken}
              actionButtonContent={
                isAddingToken ? (
                  <Loader type="Oval" color="#fff" height={20} width={20} />
                ) : (
                  <span>Add Token</span>
                )
              }
              onCancel={() => setIsOpen(false)}
              onAction={addNewToken}
            />
          </>
        )}
      </div>
    </Modal>
  )
}

export { TokenSelectOrAddModal }
