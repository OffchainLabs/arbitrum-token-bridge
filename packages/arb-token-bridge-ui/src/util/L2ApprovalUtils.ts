import { ChainId } from '../util/networks'

export type RequireL2ApproveToken = {
  symbol: string
  l1Address: string
  l2Address: string
}

const L2ApproveTokens: { [chainId: number]: RequireL2ApproveToken[] } = {
  [ChainId.ArbitrumOne]: [
    {
      symbol: 'LPT',
      l1Address: '0x58b6A8A3302369DAEc383334672404Ee733aB239',
      l2Address: '0x289ba1701C2F088cf0faf8B3705246331cB8A839'
    },
    {
      symbol: 'GRT',
      l1Address: '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
      l2Address: '0x9623063377AD1B27544C965cCd7342f7EA7e88C7'
    },
    {
      symbol: 'ARB',
      l1Address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
      l2Address: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    }
  ],
  [ChainId.ArbitrumNova]: [
    {
      symbol: 'ARB',
      l1Address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
      l2Address: '0xf823C3cD3CeBE0a1fA952ba88Dc9EEf8e0Bf46AD'
    },
    {
      symbol: 'MOON',
      l1Address: '0xb2490e357980cE57bF5745e181e537a64Eb367B1',
      l2Address: '0x0057Ac2d777797d31CD3f8f13bF5e927571D6Ad0'
    }
  ],
  [37714555429]: [
    {
      symbol: 'CU',
      l1Address: '0xd781cea0b8D5dDd0aeeD1dF7aC109C974A221B00',
      l2Address: '0xe267c440dbfb1e185d506c2cc3c44eb21340e046'
    }
  ]
}

export function tokenRequiresApprovalOnL2(
  erc20L1Address: string,
  l2ChainId: number
) {
  return (L2ApproveTokens[l2ChainId] ?? [])
    .map(token => token.l1Address.toLowerCase())
    .includes(erc20L1Address.toLowerCase())
}
