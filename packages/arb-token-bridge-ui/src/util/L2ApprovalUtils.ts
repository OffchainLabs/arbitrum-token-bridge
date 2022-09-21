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
