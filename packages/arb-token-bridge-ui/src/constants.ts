import { ERC20BridgeToken, TokenType } from './hooks/arbTokenBridge.types'
import { Token } from './pages/api/crosschain-transfers/types'
import { CommonAddress } from './util/CommonAddressUtils'

export const TOS_VERSION = 2

export const TOS_LOCALSTORAGE_KEY = 'arbitrum:bridge:tos-v' + TOS_VERSION

const SUPPORT_LINK_BASE = 'https://support.arbitrum.io'

export const GET_HELP_LINK = `${SUPPORT_LINK_BASE}/hc/en-us/requests/new?ticket_form_id=18155929976987`

export const PORTAL_DOMAIN = 'https://portal.arbitrum.io'

export const DOCS_DOMAIN = 'https://docs.arbitrum.io'

export const USDC_LEARN_MORE_LINK = `${DOCS_DOMAIN}/bridge-tokens/concepts/usdc-concept`

export const TOKEN_APPROVAL_ARTICLE_LINK = `${SUPPORT_LINK_BASE}/hc/en-us/articles/18213893952923`

export const ETH_BALANCE_ARTICLE_LINK = `${SUPPORT_LINK_BASE}/hc/en-us/articles/18213854684699`

export const CONFIRMATION_PERIOD_ARTICLE_LINK = `${SUPPORT_LINK_BASE}/hc/en-us/articles/18213843096091`

export const FAST_WITHDRAWAL_DOCS_ARTICLE_LINK = `${DOCS_DOMAIN}/run-arbitrum-node/arbos-releases/arbos31#additional-requirement-for-arbitrum-orbit-chains-who-wish-to-enable-fast-withdrawals`

export const ORBIT_QUICKSTART_LINK =
  'https://docs.arbitrum.io/launch-orbit-chain/orbit-quickstart'

export const CCTP_DOCUMENTATION =
  'https://www.circle.com/en/cross-chain-transfer-protocol'

export const MULTICALL_TESTNET_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11'

export const ETHER_TOKEN_LOGO = '/images/EthereumLogoRound.svg'

export const ether = { name: 'Ether', symbol: 'ETH', decimals: 18 } as const

export const PORTAL_API_ENDPOINT = 'https://portal.arbitrum.io'

export const commonUsdcToken: ERC20BridgeToken = {
  decimals: 6,
  address: CommonAddress.Ethereum.USDC,
  symbol: 'placeholder',
  type: TokenType.ERC20,
  name: 'placeholder',
  listIds: new Set<string>(),
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png'
}

export const bridgedUsdcToken: ERC20BridgeToken = {
  ...commonUsdcToken,
  symbol: 'USDC.e'
}

export const nativeUsdcToken: ERC20BridgeToken = {
  ...commonUsdcToken,
  symbol: 'USDC'
}
