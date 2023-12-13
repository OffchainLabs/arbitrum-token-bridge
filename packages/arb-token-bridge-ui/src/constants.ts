export const TOS_VERSION = 2

export const TOS_LOCALSTORAGE_KEY = 'arbitrum:bridge:tos-v' + TOS_VERSION

const SUPPORT_LINK_BASE = 'https://support.arbitrum.io'

export const GET_HELP_LINK = `${SUPPORT_LINK_BASE}/hc/en-us/requests/new?ticket_form_id=18155929976987`

export const PORTAL_DOMAIN = 'https://portal.arbitrum.io'

export const DOCS_DOMAIN = 'https://docs.arbitrum.io'

export const USDC_LEARN_MORE_LINK = `${DOCS_DOMAIN}/bridge-tokens/concepts/usdc-concept`

export const FAST_BRIDGE_ARTICLE_LINK = `${SUPPORT_LINK_BASE}/hc/en-us/articles/18213771832987`

export const TOKEN_APPROVAL_ARTICLE_LINK = `${SUPPORT_LINK_BASE}/hc/en-us/articles/18213893952923`

export const ETH_BALANCE_ARTICLE_LINK = `${SUPPORT_LINK_BASE}/hc/en-us/articles/18213854684699`

export const CONFIRMATION_PERIOD_ARTICLE_LINK = `${SUPPORT_LINK_BASE}/hc/en-us/articles/18213843096091`

export const ORBIT_QUICKSTART_LINK =
  'https://docs.arbitrum.io/launch-orbit-chain/orbit-quickstart'

export const CCTP_DOCUMENTATION =
  'https://www.circle.com/en/cross-chain-transfer-protocol'

export const MULTICALL_TESTNET_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11'

export const ether = { name: 'Ether', symbol: 'ETH', decimals: 18 } as const
