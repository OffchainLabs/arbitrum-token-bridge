import {
  ExploreArbitrumDeFiProjectName,
  ExploreArbitrumNFTProjectName
} from '../components/MainContent/ExploreArbitrumContent'
import {
  CEXName,
  FiatOnRampName
} from '../components/TransferPanel/LowBalanceDialogContent'
import {
  NonCanonicalTokenAddresses,
  NonCanonicalTokenNames,
  NonCanonicalTokenSupportedBridges,
  FastBridgeNames
} from './fastBridges'
import { ProviderName } from '../hooks/useNetworksAndSigners'
import { getNetworkName } from './networks'

declare global {
  interface Window {
    fathom?: {
      trackGoal: (eventId: string) => void
    }
  }
}

type AccountType = 'EOA' | 'Smart Contract'
type TokenType = 'ETH' | 'ERC-20'
type FastBridgeName = `${FastBridgeNames}`
type NonCanonicalTokenName = `${NonCanonicalTokenNames}`

const FathomNetworkNames = ['Arbitrum One', 'Arbitrum Nova'] as const
type AllNetworkNames = ReturnType<typeof getNetworkName>
type FathomNetworkName = typeof FathomNetworkNames[number]
export const isFathomNetworkName = (
  networkName: AllNetworkNames
): networkName is FathomNetworkName => {
  return FathomNetworkNames.includes(networkName as FathomNetworkName)
}

export type FathomEventNonCanonicalTokens =
  | `${NonCanonicalTokenNames.FRAX}: Fast Bridge Click: ${NonCanonicalTokenSupportedBridges<NonCanonicalTokenAddresses.FRAX>}`

export type FathomEvent =
  | 'Address Block'
  //
  | `Connect Wallet Click: ${ProviderName}`
  //
  | `Deposit ${TokenType} to ${FathomNetworkName} (${AccountType})`
  | `Withdraw ${TokenType} from ${FathomNetworkName} (${AccountType})`
  //
  | `Explore: DeFi Project Click: ${ExploreArbitrumDeFiProjectName}`
  | `Explore: NFT Project Click: ${ExploreArbitrumNFTProjectName}`
  | `Explore: Randomize Click`
  //
  | `CEX Click: ${CEXName}`
  | `Fiat On-Ramp Click: ${FiatOnRampName}`
  //
  | `Fast Bridge Click: ${FastBridgeName}`
  | `${NonCanonicalTokenName}: Use Arbitrum Bridge Click`
  | `${NonCanonicalTokenName}: Copy Bridge Link Click`
  //
  | `Slow Bridge Click`
  | `Move More Funds Click`
  | `Add to Google Calendar Click`
  //
  | 'Switch Network and Transfer'
  //
  | `Redeem Retryable on ${FathomNetworkName}`
  //
  | `Open Transaction History Click`
  | `Open Transaction History Click: Tx Info Banner`
  //
  | `Tx Error: Get Help Click on ${FathomNetworkName}`
  | `Multiple Tx Error: Get Help Click on ${FathomNetworkName}`

const eventToEventId: { [key in FathomEvent]: string } & {
  [key in FathomEventNonCanonicalTokens]: string
} = {
  'Address Block': 'KG4YHGXC',
  //
  'Connect Wallet Click: MetaMask': 'VGEJWUHT',
  'Connect Wallet Click: Coinbase Wallet': 'CSNSGTI5',
  'Connect Wallet Click: WalletConnect': 'QPDOCSPL',
  //
  'Deposit ETH to Arbitrum One (EOA)': 'UL9WSZQO',
  'Deposit ETH to Arbitrum One (Smart Contract)': 'HMAEKCNM',
  'Deposit ETH to Arbitrum Nova (EOA)': 'QAIO4AJ1',
  'Deposit ETH to Arbitrum Nova (Smart Contract)': 'JEJCCAX5',
  'Deposit ERC-20 to Arbitrum One (EOA)': 'JFSNEA7Z',
  'Deposit ERC-20 to Arbitrum One (Smart Contract)': 'W26LHYUZ',
  'Deposit ERC-20 to Arbitrum Nova (EOA)': 'K1VGFDC5',
  'Deposit ERC-20 to Arbitrum Nova (Smart Contract)': 'WFVNXUXA',
  'Withdraw ETH from Arbitrum One (EOA)': 'PACZDLXE',
  'Withdraw ETH from Arbitrum One (Smart Contract)': 'F3N3OBE9',
  'Withdraw ETH from Arbitrum Nova (EOA)': 'MGEAJZ7A',
  'Withdraw ETH from Arbitrum Nova (Smart Contract)': 'RML4LVRI',
  'Withdraw ERC-20 from Arbitrum One (EOA)': '9B33K1F3',
  'Withdraw ERC-20 from Arbitrum One (Smart Contract)': 'A2GD3YQA',
  'Withdraw ERC-20 from Arbitrum Nova (EOA)': '4KA57CQE',
  'Withdraw ERC-20 from Arbitrum Nova (Smart Contract)': '4VA53F84',
  //
  'Explore: DeFi Project Click: Uniswap': 'GD30QTVK',
  'Explore: DeFi Project Click: SushiSwap': '1FSKVH8U',
  'Explore: DeFi Project Click: Curve': '2VK5GI5K',
  'Explore: DeFi Project Click: Aave': 'GUOQMB1B',
  'Explore: DeFi Project Click: GMX': '1P9YY5PL',
  'Explore: DeFi Project Click: Dopex': 'SZPHSXIE',
  'Explore: DeFi Project Click: TreasureDAO': 'YVGKJ1CX',
  'Explore: DeFi Project Click: Balancer': '4FZQAI5H',
  'Explore: DeFi Project Click: Jones DAO': 'LOUGONM6',
  'Explore: DeFi Project Click: 1inch': 'DZBLQTEL',
  'Explore: DeFi Project Click: Beefy Finance': 'NDMROCKL',
  'Explore: DeFi Project Click: Yearn Finance': '32U989O7',
  'Explore: DeFi Project Click: KyberSwap': 'RVW7KSNB',
  'Explore: DeFi Project Click: Sperax': '6IVIM3JM',
  //
  'Explore: NFT Project Click: Arbibots': 'UKENMGHD',
  'Explore: NFT Project Click: Smol Brains': '7JMIH5HA',
  'Explore: NFT Project Click: Battlefly': 'X6SJPXIZ',
  'Explore: NFT Project Click: Bridgeworld': 'FGONZVFV',
  'Explore: NFT Project Click: Diamond Pepes': 'URQL1V1O',
  'Explore: NFT Project Click: GMX Blueberry Club': 'CLCORI2X',
  'Explore: NFT Project Click: Toadstoolz': '86GGM1X5',
  'Explore: NFT Project Click: Smol Bodies': '4QWJGIK3',
  'Explore: NFT Project Click: Tales of Elleria': 'FM8M0QG3',
  'Explore: NFT Project Click: RandomWalkNFT': 'BTXARIM1',
  'Explore: NFT Project Click: City Clash': 'DSBNPBGZ',
  'Explore: NFT Project Click: Arbidudes': '2IPJGJ5S',
  'Explore: NFT Project Click: CastleDAO': 'QZOB4Q05',
  'Explore: NFT Project Click: The Lost Donkeys': 'JPUFDZPF',
  'Explore: NFT Project Click: Realm': 'WNDPBXBS',
  'Explore: NFT Project Click: SmithyDAO': 'KIBVXEXH',
  'Explore: NFT Project Click: Mithical': 'NEMVXNXN',
  'Explore: NFT Project Click: Farmland': 'TJLLNSHG',
  'Explore: NFT Project Click: OpenSea': 'F5RJY3S0',
  //
  'Explore: Randomize Click': '9M9C7EZ3',
  //
  'CEX Click: Binance': 'TO6BRQEP',
  'CEX Click: Bitget': 'P2RBDSLX',
  'CEX Click: Bybit': '4MCGRHS8',
  'CEX Click: Crypto.com': 'ZVK2C6WN',
  'CEX Click: Kucoin': 'LKGN4G9R',
  'CEX Click: MEXC': 'NY3ECWCL',
  'CEX Click: OKX': '8UGCXUUS',
  //
  'Fiat On-Ramp Click: Banxa': 'IJDAFM7U',
  'Fiat On-Ramp Click: CryptoRefills': 'VKDJFRJU',
  'Fiat On-Ramp Click: FluidFi': 'AOLZ3ME2',
  'Fiat On-Ramp Click: Mt Pelerin': '8GKV135S',
  'Fiat On-Ramp Click: Ramp': 'IJQLRRB9',
  'Fiat On-Ramp Click: Simplex': 'FAERNLIC',
  'Fiat On-Ramp Click: Transak': 'FKEOPFNQ',
  'Fiat On-Ramp Click: Wirex': 'BNQOEXBL',
  //
  'Fast Bridge Click: Hop': 'W70GIPZ0',
  'Fast Bridge Click: Celer': 'JGSCWGST',
  'Fast Bridge Click: Connext': 'KFF7GMET',
  'Fast Bridge Click: Across': 'EZDV8TMY',
  'Fast Bridge Click: Synapse': 'SKUFXFQR',
  'Fast Bridge Click: Stargate': '6VZXVGEQ',
  //
  'FRAX: Fast Bridge Click: Celer': '6PZJPSBO',
  'FRAX: Use Arbitrum Bridge Click': 'THMMEGSP',
  'FRAX: Copy Bridge Link Click': 'WWJ8WGXM',
  //
  'Slow Bridge Click': '9CEY3IGM',
  'Move More Funds Click': 'YE1OYTL4',
  'Add to Google Calendar Click': 'CZTO23FP',
  //
  'Switch Network and Transfer': '4F5SKZRG',
  //
  'Redeem Retryable on Arbitrum One': 'UHPNE3XJ',
  'Redeem Retryable on Arbitrum Nova': 'AQDHUKER',
  //
  'Open Transaction History Click': 'BNE3W7KB',
  'Open Transaction History Click: Tx Info Banner': 'I9AMOFHA',
  //
  'Tx Error: Get Help Click on Arbitrum One': 'HT1BWVVI',
  'Tx Error: Get Help Click on Arbitrum Nova': 'XD5VYLPU',
  'Multiple Tx Error: Get Help Click on Arbitrum One': 'CWMVRSXW',
  'Multiple Tx Error: Get Help Click on Arbitrum Nova': '2VOXN4FB'
}

export function trackEvent(event: FathomEvent | FathomEventNonCanonicalTokens) {
  if (typeof window.fathom === 'undefined') {
    return
  }

  if (typeof eventToEventId[event] === 'undefined') {
    return
  }

  window.fathom.trackGoal(eventToEventId[event])
}
