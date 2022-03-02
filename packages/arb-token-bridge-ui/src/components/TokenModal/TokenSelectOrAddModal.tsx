import { useMemo } from 'react'

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

  function selectListedToken() {
    if (typeof listedToken === 'undefined') {
      return
    }

    token.updateTokenData(listedToken.address)
    actions.app.setSelectedToken(listedToken)

    setIsOpen(false)
  }

  // if (isLoadingTokenList) {
  //   return null
  // }

  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title="Select Token"
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
          <div className="flex justify-end">
            <button
              className="inline-flex justify-center m-1 rounded-md border border-transparent shadow-sm px-4 py-2 bg-bright-blue hover:bg-faded-blue text-base font-medium text-white  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
              onClick={selectListedToken}
            >
              Select
            </button>
          </div>
        </div>
      ) : (
        <span>
          Token {address} does not exist on our token list. Are you sure you
          want to add it?
        </span>
      )}
    </Modal>
  )
}

export { TokenSelectOrAddModal }
