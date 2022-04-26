import { useEffect, useState, useContext, useCallback, useMemo } from 'react'

import { constants } from 'ethers'
import { ERC20__factory } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

const L2ApproveTokens = [
  {
    l1Address: '0x58b6A8A3302369DAEc383334672404Ee733aB239',
    l2Address: '0x289ba1701C2F088cf0faf8B3705246331cB8A839'
  }
].map(token => {
  const { l1Address, l2Address } = token
  return {
    l1Address: l1Address.toLowerCase(),
    l2Address: l2Address.toLowerCase()
  }
})

const L2ApproveTokensL1Address = L2ApproveTokens.map(t => t.l1Address)

const useL2Approve = () => {
  const {
    app: { selectedToken, arbTokenBridge }
  } = useAppState()
  const {
    l1: { network: l1Network },
    l2: { signer: l2Signer }
  } = useNetworksAndSigners()

  const [doneAddingTokens, setDoneAddingTokens] = useState(false)

  const addTokens = useCallback(async () => {
    if (!l2Signer || !l2Signer.provider) return
    try {
      for (let i = 0; i < L2ApproveTokens.length; i += 1) {
        const { l1Address, l2Address } = L2ApproveTokens[i]
        if (!l2Address) continue
        const token = ERC20__factory.connect(l2Address, l2Signer.provider)
        const l2Bal = await token.balanceOf(arbTokenBridge.walletAddress)
        if (!l2Bal.eq(constants.Zero)) {
          // add it if user has an L2 balance

          await arbTokenBridge.token.add(l1Address)
        }
      }
    } catch (err) {
      console.warn(err)
    }
  }, [ arbTokenBridge])

  useEffect(() => {
    if (
      !arbTokenBridge ||
      !arbTokenBridge.token ||
      doneAddingTokens ||
      !(l1Network && l1Network.chainID === 1)
    )
      return
    // when ready/ on load, add tokens
    addTokens()
    setDoneAddingTokens(true)
  }, [bridge, doneAddingTokens, arbTokenBridge])

  const shouldRequireApprove = useMemo(() => {
    if (!selectedToken) return false
    return L2ApproveTokensL1Address.includes(
      selectedToken.address.toLowerCase()
    )
  }, [selectedToken])

  return { shouldRequireApprove }
}

export default useL2Approve
