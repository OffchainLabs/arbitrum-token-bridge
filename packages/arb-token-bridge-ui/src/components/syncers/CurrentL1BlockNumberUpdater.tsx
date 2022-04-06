import { useEffect } from 'react'

import { useActions } from '../../state'
import { useSigners } from '../../hooks/useSigners'

// Updates the current block number which is used to calculate pending withdrawal time
export function CurrentL1BlockNumberUpdater(): JSX.Element {
  const actions = useActions()
  const { l1Signer } = useSigners()

  const ethProvider = l1Signer?.provider

  useEffect(() => {
    function setBlock(blockNumber: number) {
      console.info('Current l1 blockNumber:', blockNumber)
      actions.app.setCurrentL1BlockNumber(blockNumber)
    }

    ethProvider?.on('block', setBlock)

    return () => {
      ethProvider?.off('block', setBlock)
    }
  }, [ethProvider])

  return <></>
}
