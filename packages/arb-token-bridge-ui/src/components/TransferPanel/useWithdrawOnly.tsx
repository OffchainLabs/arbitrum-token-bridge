import { useEffect, useState, useCallback, useMemo } from 'react'
import { constants } from 'ethers'

import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

const withdrawOnlyTokens = [
  {
    symbol: 'MIM',
    l2CustomAddr: '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A',
    l1Address: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
    l2Address: '0xB20A02dfFb172C474BC4bDa3fD6f4eE70C04daf2'
  },
  {
    symbol: 'SPA',
    l2CustomAddr: '0x5575552988A3A80504bBaeB1311674fCFd40aD4B',
    l1Address: '0xB4A3B0Faf0Ab53df58001804DdA5Bfc6a3D59008',
    l2Address: '0xe5a5Efe7ec8cdFA5F031D5159839A3b5E11B2e0F'
  },
  {
    symbol: 'FST',
    l2CustomAddr: '0x90e81b81307ece4257c1bb74bea94f5232cece53',
    l1Address: '0x0e192d382a36de7011f795acc4391cd302003606',
    l2Address: '0x488cc08935458403a0458e45E20c0159c8AB2c92'
  },
  {
    symbol: 'wstETH',
    l2CustomAddr: '',
    l1Address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    l2Address: ''
  },
  {
    symbol: 'stETH',
    l2CustomAddr: '',
    l1Address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    l2Address: ''
  },
  {
    symbol: 'LDO',
    l2CustomAddr: '',
    l1Address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    l2Address: ''
  },
  {
    symbol: 'renBTC',
    l2CustomAddr: '0xdbf31df14b66535af65aac99c32e9ea844e14501',
    l1Address: '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D',
    l2Address: '0x3E06AF0fBB92D1f6e5c6008fcec81130D0cC65a3'
  },
  {
    symbol: 'STG',
    l2CustomAddr: '0x6694340fc020c5e6b96567843da2df01b2ce1eb6',
    l1Address: '0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6',
    l2Address: '0xe018c7a3d175fb0fe15d70da2c874d3ca16313ec'
  },
  {
    symbol: 'HND',
    l2CustomAddr: '0x10010078a54396f62c96df8532dc2b4847d47ed3',
    l1Address: '0x10010078a54396F62c96dF8532dc2B4847d47ED3',
    l2Address: '0x626195b5a8b5f865E3516201D6ac30ee1B46A6e9'
  },
  {
    symbol: 'FRAX',
    l2CustomAddr: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
    l1Address: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
    l2Address: '0x7468a5d8E02245B00E8C0217fCE021C70Bc51305'
  },
  {
    symbol: 'gOHM',
    l2CustomAddr: '0x8D9bA570D6cb60C7e3e0F31343Efe75AB8E65FB1',
    l1Address: '0x0ab87046fBb341D058F17CBC4c1133F25a20a52f',
    l2Address: '0x0D5f2b781A13722bA19e35857Fb6676594824960'
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
