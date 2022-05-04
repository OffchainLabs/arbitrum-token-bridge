import { useEffect, useState, useCallback, useMemo } from 'react'
import { constants } from 'ethers'

import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

const withdrawOnlyTokens = [
  {
    symbol: 'MIM',
    l1Address: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
    l2Address: '0xB20A02dfFb172C474BC4bDa3fD6f4eE70C04daf2'
  },
  {
    symbol: 'SPA',
    l1Address: '0xB4A3B0Faf0Ab53df58001804DdA5Bfc6a3D59008',
    l2Address: '0xe5a5Efe7ec8cdFA5F031D5159839A3b5E11B2e0F'
  },
  {
    symbol: 'FST',
    l1Address: '0x0e192d382a36de7011f795acc4391cd302003606',
    l2Address: '0x488cc08935458403a0458e45E20c0159c8AB2c92'
  },
  {
    symbol: 'wstETH',
    l1Address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    l2Address: ''
  },
  {
    symbol: 'stETH',
    l1Address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    l2Address: ''
  },
  {
    symbol: 'LDO',
    l1Address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    l2Address: ''
  },
  {
    symbol: 'renBTC',
    l1Address: '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D',
    l2Address: '0x3E06AF0fBB92D1f6e5c6008fcec81130D0cC65a3'
  },
  {
    symbol: 'STG',
    l1Address: '0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6',
    l2Address: '0xe018c7a3d175fb0fe15d70da2c874d3ca16313ec'
  },
  {
    symbol: 'HND',
    l1Address: '0x10010078a54396F62c96dF8532dc2B4847d47ED3',
    l2Address: '0x626195b5a8b5f865E3516201D6ac30ee1B46A6e9'
  },
  {
    symbol: 'FRAX',
    l1Address: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
    l2Address: '0x7468a5d8E02245B00E8C0217fCE021C70Bc51305'
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
    l1: { network: l1Network }
  } = useNetworksAndSigners()
  const {
    app: { selectedToken, arbTokenBridge }
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
    if (typeof l1Network === 'undefined') {
      return
    }

    const isMainnet = l1Network.chainID === 1

    if (
      !isMainnet ||
      !arbTokenBridge ||
      !arbTokenBridge.token ||
      arbTokenBridge.walletAddress === '' ||
      doneAddingTokens
    ) {
      return
    }

    // when ready/ on load, add tokens
    addTokens()
    setDoneAddingTokens(true)
  }, [doneAddingTokens, arbTokenBridge, l1Network])

  const shouldDisableDeposit = useMemo(() => {
    if (!selectedToken) return false
    return withdrawOnlyTokensL1Address.includes(
      selectedToken.address.toLowerCase()
    )
  }, [selectedToken])

  return { shouldDisableDeposit }
}

export default useWithdrawOnly
