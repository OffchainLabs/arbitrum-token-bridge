import { useState, useMemo } from 'react'
import Loader from 'react-loader-spinner'
import { ERC20BridgeToken } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { Modal } from '../common/Modal'

const TokenSelectOrAddModal = ({
  isOpen,
  setIsOpen,
  address
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  address: string | undefined
}): JSX.Element | null => {
  const {
    app: {
      arbTokenBridge: { bridgeTokens, token }
    }
  } = useAppState()
  const actions = useActions()

  const [isSelectingToken, setIsSelectingToken] = useState<boolean>(false)
  const [isAddingToken, setIsAddingToken] = useState<boolean>(false)

  const isLoadingTokenList = useMemo(
    () => typeof bridgeTokens === 'undefined',
    [bridgeTokens]
  )

  const listedToken = useMemo(() => {
    if (isLoadingTokenList) {
      return undefined
    }

    return bridgeTokens[address || '']
  }, [bridgeTokens, isLoadingTokenList])

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
      await storeNewToken(address!)
    } catch (ex) {
      console.log(ex)
    } finally {
      setIsOpen(false)
      setIsAddingToken(false)
    }
  }

  // if (isLoadingTokenList) {
  //   return null
  // }

  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={listedToken ? 'Select Token' : 'Add Token'}
      hideButton
    >
      {listedToken ? (
        <div className="flex flex-col space-y-2">
          <div className="flex justify-center">
            <img
              className="rounded-full w-8 h-8"
              src={listedToken.logoURI}
              alt={`${listedToken.name} logo`}
            />
          </div>
          <span>
            Token <span className="font-medium">{listedToken.address}</span>{' '}
            exists on our token list as{' '}
            <span className="font-medium">
              {listedToken.name} ({listedToken.symbol})
            </span>
            . Do you want to select it?
          </span>
          <div className="flex justify-end space-x-2">
            {!isSelectingToken && (
              <button
                className="w-full inline-flex items-center justify-center rounded-md border border-gray-300 shadow-sm px-4 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
            )}
            <button
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-bright-blue hover:bg-faded-blue text-base font-medium text-white  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
              onClick={async () => {
                await selectToken(listedToken)
                setIsOpen(false)
              }}
              disabled={isSelectingToken}
            >
              {isSelectingToken ? (
                <Loader type="Oval" color="#fff" height={20} width={20} />
              ) : (
                <span>Select Token</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-2">
          <span>
            Token <span className="font-medium">{address}</span> is not on the
            token list.
          </span>
          <span>Would you like to add it?</span>
          <div className="flex justify-end space-x-2">
            {!isAddingToken && (
              <button
                className="w-full inline-flex items-center justify-center rounded-md border border-gray-300 shadow-sm px-4 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
            )}
            <button
              className="inline-flex justify-center rounded-md shadow-sm px-4 py-2 bg-bright-blue hover:bg-faded-blue text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
              disabled={isAddingToken}
              onClick={addNewToken}
            >
              {isAddingToken ? (
                <Loader type="Oval" color="#fff" height={20} width={20} />
              ) : (
                <span>Add Token</span>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export { TokenSelectOrAddModal }
