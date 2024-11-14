import { ChainId } from '../util/networks'
import { xErc20RequiresApprovalOnChildChain } from './xErc20Utils'

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
    },
    {
      symbol: 'saETH',
      l1Address: '0xF1617882A71467534D14EEe865922de1395c9E89',
      l2Address: '0xF1617882A71467534D14EEe865922de1395c9E89'
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
  [ChainId.ArbitrumSepolia]: [
    {
      symbol: 'ARB',
      l1Address: '0xfa898E8d38B008F3bAc64dce019A9480d4F06863',
      l2Address: '0xc275b23c035a9d4ec8867b47f55427e0bdce14cb'
    }
  ],
  // xai mainnet
  [660279]: [
    {
      symbol: 'wCU',
      l1Address: '0x89c49a3fa372920ac23ce757a029e6936c0b8e02',
      l2Address: '0x89c49a3fa372920ac23ce757a029e6936c0b8e02'
    }
  ],
  // xai testnet
  [37714555429]: [
    {
      symbol: 'CU',
      l1Address: '0xd781cea0b8D5dDd0aeeD1dF7aC109C974A221B00',
      l2Address: '0xe267c440dbfb1e185d506c2cc3c44eb21340e046'
    }
  ],
  // pop apex
  [70700]: [
    {
      symbol: 'USDC.e',
      l1Address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      l2Address: '0x094ae96521f35284e04fdf023ca06fe878e307fd'
    }
  ]
}

export type TokenWithdrawalApprovalParams = {
  tokenAddressOnParentChain: string
  parentChainId: ChainId
  childChainId: ChainId
}

export async function tokenRequiresApprovalOnL2(
  params: TokenWithdrawalApprovalParams
) {
  if (await xErc20RequiresApprovalOnChildChain(params)) {
    return true
  }

  const { tokenAddressOnParentChain, childChainId } = params

  return (L2ApproveTokens[childChainId] ?? [])
    .map(token => token.l1Address.toLowerCase())
    .includes(tokenAddressOnParentChain.toLowerCase())
}
