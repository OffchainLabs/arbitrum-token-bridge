import { useEffect, useState, useContext, useCallback, useMemo } from 'react'

import { constants } from 'ethers'
import { ERC20__factory } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import { BridgeContext } from '../App/App'

const withdrawOnlyTokens = [
  {
    l1Address: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
    l2Address: '0xB20A02dfFb172C474BC4bDa3fD6f4eE70C04daf2'
  },
  {
    l1Address: '0xB4A3B0Faf0Ab53df58001804DdA5Bfc6a3D59008',
    l2Address: '0xe5a5Efe7ec8cdFA5F031D5159839A3b5E11B2e0F'
  },
  {
    l1Address: '0x0e192d382a36de7011f795acc4391cd302003606',
    l2Address: '0x488cc08935458403a0458e45E20c0159c8AB2c92'
  }
].map(token => {
  const { l1Address, l2Address } = token
  return {
    l1Address: l1Address.toLowerCase(),
    l2Address: l2Address.toLowerCase()
  }
})

const withdrawOnlyTokensL1Address = withdrawOnlyTokens.map(t => t.l1Address)

const useWithdrawOnly = () => {
  const {
    app: { selectedToken, arbTokenBridge, l1NetworkDetails }
  } = useAppState()
  const [doneAddingTokens, setDoneAddingTokens] = useState(false)
  const bridge = useContext(BridgeContext)

  const addTokens = useCallback(async () => {
    if (!bridge) return
    const userAddress = await bridge.l2Signer.getAddress()
    try {
      for (let i = 0; i < withdrawOnlyTokens.length; i += 1) {
        const { l1Address, l2Address } = withdrawOnlyTokens[i]
        const token = ERC20__factory.connect(l2Address, bridge.l2Provider)
        const l2Bal = await token.balanceOf(userAddress)
        if (!l2Bal.eq(constants.Zero)) {
          // add it if user has an L2 balance

          await arbTokenBridge.token.add(l1Address)
        }
      }
    } catch (err) {
      console.warn(err)
    }
  }, [bridge, arbTokenBridge])

  useEffect(() => {
    if (
      !bridge ||
      !arbTokenBridge ||
      !arbTokenBridge.token ||
      doneAddingTokens ||
      !(l1NetworkDetails && l1NetworkDetails.chainID === '1')
    )
      return
    // when ready/ on load, add tokens
    addTokens()
    setDoneAddingTokens(true)
  }, [bridge, doneAddingTokens, arbTokenBridge])

  const shouldDisableDeposit = useMemo(() => {
    if (!selectedToken) return false
    return withdrawOnlyTokensL1Address.includes(
      selectedToken.address.toLowerCase()
    )
  }, [selectedToken])

  return { shouldDisableDeposit }
}

export default useWithdrawOnly
