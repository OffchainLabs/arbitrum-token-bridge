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
type FathomNetworkName = (typeof FathomNetworkNames)[number]
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
