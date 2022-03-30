import { useEffect, useState, useCallback, useMemo } from 'react'
import { constants } from 'ethers'

import { useAppState } from '../../state'

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
  },
  {
    l1Address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    l2Address: ''
  },
  {
    l1Address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    l2Address: ''
  },
  {
    l1Address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    l2Address: ''
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

  const addTokens = useCallback(async () => {
    try {
      for (let i = 0; i < withdrawOnlyTokens.length; i += 1) {
        const { l1Address, l2Address } = withdrawOnlyTokens[i]

        if (!l2Address) {
          continue
        }

        const { balance } = await arbTokenBridge.token.getL2TokenData(l2Address)

        // add it if user has an L2 balance
        if (!balance.eq(constants.Zero)) {
          await arbTokenBridge.token.add(l1Address)
        }
      }
    } catch (err) {
      console.warn(err)
    }
  }, [arbTokenBridge])

  useEffect(() => {
    if (
      !arbTokenBridge ||
      !arbTokenBridge.token ||
      arbTokenBridge.walletAddress === '' ||
      doneAddingTokens ||
      !(l1NetworkDetails && l1NetworkDetails.chainID === '1')
    )
      return
    // when ready/ on load, add tokens
    addTokens()
    setDoneAddingTokens(true)
  }, [doneAddingTokens, arbTokenBridge])

  const shouldDisableDeposit = useMemo(() => {
    if (!selectedToken) return false
    return withdrawOnlyTokensL1Address.includes(
      selectedToken.address.toLowerCase()
    )
  }, [selectedToken])

  return { shouldDisableDeposit }
}

export default useWithdrawOnly
