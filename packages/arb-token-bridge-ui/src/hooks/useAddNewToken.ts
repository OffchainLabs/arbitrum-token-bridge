import { useCallback, useState } from 'react'
import { useAppState } from '../state'
import { isAddress } from 'ethers/lib/utils'

const useAddNewToken = () => {
  const [errorMessage, setErrorMessage] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)
  const {
    app: {
      arbTokenBridge: { token }
    }
  } = useAppState()

  const storeNewToken = useCallback(
    async (L1Address: string) => {
      return token.add(L1Address).catch((ex: Error) => {
        let error = 'Token not found on this network.'

        if (ex.name === 'TokenDisabledError') {
          error = 'This token is currently paused in the bridge.'
        }

        setErrorMessage(error)
      })
    },
    [token]
  )

  const addNewToken = useCallback(
    async (address: string) => {
      if (!isAddress(address) || isAddingToken) {
        return
      }

      setIsAddingToken(true)

      try {
        await storeNewToken(address)
      } catch (ex) {
        console.log(ex)
      } finally {
        setIsAddingToken(false)
      }
    },
    [isAddingToken, storeNewToken]
  )

  return {
    error: errorMessage,
    loading: isAddingToken,
    addNewToken
  }
}

export { useAddNewToken }
