import { useEffect } from 'react'

import { useActions } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

// Updates the current block number which is used to calculate pending withdrawal time
export function CurrentL1BlockNumberUpdater(): JSX.Element {
  const actions = useActions()
  const {
    l1: { signer: l1Signer }
  } = useNetworksAndSigners()

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
