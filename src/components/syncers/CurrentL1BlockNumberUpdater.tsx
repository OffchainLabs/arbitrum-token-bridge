import React, { useContext, useEffect } from 'react'

import { ethers } from 'ethers'

import { useActions } from '../../state'
import { BridgeContext } from '../App/App'

const CurrentL1BlockNumberUpdater = (): JSX.Element => {
  const bridge = useContext(BridgeContext)

  const ethProvider = bridge?.l1Bridge?.l1Signer
    ?.provider as ethers.providers.Provider

  const actions = useActions()

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

export { CurrentL1BlockNumberUpdater }
