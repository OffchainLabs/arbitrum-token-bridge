import { ChainId } from '../util/networks'

export type WithdrawOnlyToken = {
  symbol: string
  l2CustomAddr: string
  l1Address: string
  l2Address: string
}

const withdrawOnlyTokens: { [chainId: number]: WithdrawOnlyToken[] } = {
  [ChainId.ArbitrumOne]: [
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
    // {
    //   symbol: 'FRAX',
    //   l2CustomAddr: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
    //   l1Address: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
    //   l2Address: '0x7468a5d8E02245B00E8C0217fCE021C70Bc51305'
    // },
    {
      symbol: 'FXS',
      l2CustomAddr: '0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7',
      l1Address: '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
      l2Address: '0xd9f9d2Ee2d3EFE420699079f16D9e924affFdEA4'
    },
    {
      symbol: 'gOHM',
      l2CustomAddr: '0x8D9bA570D6cb60C7e3e0F31343Efe75AB8E65FB1',
      l1Address: '0x0ab87046fBb341D058F17CBC4c1133F25a20a52f',
      l2Address: '0x0D5f2b781A13722bA19e35857Fb6676594824960'
    },
    {
      symbol: 'alUSD',
      l2CustomAddr: '0xCB8FA9a76b8e203D8C3797bF438d8FB81Ea3326A',
      l1Address: '0xbc6da0fe9ad5f3b0d58160288917aa56653660e9',
      l2Address: '0x95d2C35934f4eA0076E6f5e8d6edd8080666F84e'
    },
    {
      symbol: 'alETH',
      l2CustomAddr: '',
      l1Address: '0x0100546F2cD4C9D97f798fFC9755E47865FF7Ee6',
      l2Address: '0xC05A105F4EC1ef28a4e7c0cb30Cb791B40FdD66B'
    },
    {
      symbol: 'gALCX',
      l2CustomAddr: '0x870d36B8AD33919Cc57FFE17Bb5D3b84F3aDee4f',
      l1Address: '0x93dede06ae3b5590af1d4c111bc54c3f717e4b35',
      l2Address: '0xEa4d9cE1fE1134528402A79f7B7Eacf87a930C8F'
    },
    {
      symbol: 'USX',
      l2CustomAddr: '0x641441c631e2f909700d2f41fd87f0aa6a6b4edb',
      l1Address: '0x0a5e677a6a24b2f1a2bf4f3bffc443231d2fdec8',
      l2Address: '0xcd14C3A2ba27819B352aae73414A26e2b366dC50'
    },
    {
      symbol: 'SYN',
      l2CustomAddr: '0x080f6aed32fc474dd5717105dba5ea57268f46eb',
      l1Address: '0x0f2d719407fdbeff09d87557abb7232601fd9f29',
      l2Address: '0x1bcfc0b4ee1471674cd6a9f6b363a034375ead84'
    },
    {
      symbol: 'EMAX',
      l2CustomAddr: '0x123389C2f0e9194d9bA98c21E63c375B67614108',
      l1Address: '0x15874d65e649880c2614e7a480cb7c9A55787FF6',
      l2Address: '0x94293e4e6ab410E898aa68318D0A964106Ff3257'
    }
  ],
  [ChainId.ArbitrumNova]: [
    {
      symbol: 'USDT',
      l2CustomAddr: '0xeD9d63a96c27f87B07115b56b2e3572827f21646',
      l1Address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      l2Address: '0x52484E1ab2e2B22420a25c20FA49E173a26202Cd'
    }
  ]
}

export function isWithdrawOnlyToken(erc20L1Address: string, chainId: number) {
  return (withdrawOnlyTokens[chainId] ?? [])
    .map(token => token.l1Address.toLowerCase())
    .includes(erc20L1Address.toLowerCase())
}
