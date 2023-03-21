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
    }
  ],
  [ChainId.ArbitrumGoerli]: [
    {
      symbol: 'GRT',
      l1Address: '0x5c946740441C12510a167B447B7dE565C20b9E3C',
      l2Address: '0x18C924BD5E8b83b47EFaDD632b7178E2Fd36073D'
    },
    {
      symbol: 'ARB',
      l1Address: '0xECCc8dE9b0a0F1074D8dc6E1092964A3Bc400a41',
      l2Address: '0xF861378B543525ae0C47d33C90C954Dc774Ac1F9'
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
