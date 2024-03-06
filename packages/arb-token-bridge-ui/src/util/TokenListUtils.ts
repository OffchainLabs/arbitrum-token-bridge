import axios from 'axios'
import { schema, TokenList } from '@uniswap/token-lists'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { ImageProps } from 'next/image'
import UniswapLogo from '@/images/lists/uniswap.png'
import GeminiLogo from '@/images/lists/gemini.png'
import CMCLogo from '@/images/lists/cmc.png'
import CoinGeckoLogo from '@/images/lists/coinGecko.svg'
import ArbitrumLogo from '@/images/lists/ArbitrumLogo.png'
import { ArbTokenBridge } from '../hooks/arbTokenBridge.types'
import { ChainId } from './networks'

export const SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID = 0

export interface BridgeTokenList {
  id: number
  originChainID: number
  url: string
  name: string
  isDefault: boolean
  isArbitrumTokenTokenList?: boolean
  logoURI: ImageProps['src']
  isValid?: boolean
}

export const BRIDGE_TOKEN_LISTS: BridgeTokenList[] = [
  {
    id: SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID,
    originChainID: 0, // This token list spans all Arbitrum chains and their L1 counterparts
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbitrum_token_token_list.json',
    name: 'Arbitrum Token',
    isDefault: true,
    logoURI: ArbitrumLogo,
    isArbitrumTokenTokenList: true
  },
  {
    id: 1,
    originChainID: ChainId.ArbitrumOne,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
    name: 'Arbitrum Whitelist Era',
    isDefault: true,
    logoURI: ArbitrumLogo
  },
  {
    id: 2,
    originChainID: ChainId.ArbitrumOne,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_default.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo
  },
  {
    id: 3,
    originChainID: ChainId.ArbitrumOne,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_gemini_token_list.json',
    name: 'Arbed Gemini List',
    isDefault: true,
    logoURI: GeminiLogo
  },
  {
    id: 4,
    originChainID: ChainId.ArbitrumOne,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coingecko.json',
    name: 'Arbed CoinGecko List',
    isDefault: true,
    logoURI: CoinGeckoLogo
  },
  {
    id: 5,
    originChainID: ChainId.ArbitrumOne,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: false,
    logoURI: CMCLogo
  },
  {
    id: 6,
    originChainID: ChainId.ArbitrumNova,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo
  },
  {
    id: 7,
    originChainID: ChainId.ArbitrumNova,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_gemini_token_list.json',
    name: 'Arbed Gemini List',
    isDefault: true,
    logoURI: GeminiLogo
  },
  {
    id: 8,
    originChainID: ChainId.ArbitrumGoerli,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: true,
    logoURI: CMCLogo
  },
  // Dummy data required, otherwise useArbTokenBridge will return undefined bridgeTokens
  // This will cause TokenImportDialog to hang and fail E2E
  // TODO: remove list for chain ID 412346 after fix:
  // https://github.com/OffchainLabs/arb-token-bridge/issues/564
  {
    id: 9,
    // Local node
    originChainID: ChainId.ArbitrumLocal,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: true,
    logoURI: CMCLogo
  },
  {
    id: 10,
    originChainID: ChainId.ArbitrumSepolia,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_uniswap_labs.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo
  },
  // CoinGecko
  {
    id: 11,
    originChainID: ChainId.ArbitrumNova,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coingecko.json',
    name: 'Arbed CoinGecko List',
    isDefault: true,
    logoURI: CoinGeckoLogo
  },
  {
    id: 12,
    originChainID: ChainId.ArbitrumGoerli,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coingecko.json',
    name: 'Arbed CoinGecko List',
    isDefault: true,
    logoURI: CoinGeckoLogo
  },
  {
    id: 13,
    originChainID: ChainId.ArbitrumSepolia,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_coingecko.json',
    name: 'Arbed CoinGecko List',
    isDefault: true,
    logoURI: CoinGeckoLogo
  },
  // Orbit
  {
    id: 14,
    // Xai
    originChainID: 660279,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/660279_arbed_uniswap_labs.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo
  },
  {
    id: 15,
    // Rari
    originChainID: 1380012617,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/1380012617_arbed_uniswap_labs.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo
  },
  {
    id: 16,
    // Muster
    originChainID: 4078,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/4078_arbed_uniswap_labs.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo
  },
  {
    id: 17,
    // Proof of Play Apex
    originChainID: 70700,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/70700_arbed_uniswap_labs.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo
  }
]

export const listIdsToNames: { [key: string]: string } = {}

BRIDGE_TOKEN_LISTS.forEach(bridgeTokenList => {
  listIdsToNames[bridgeTokenList.id] = bridgeTokenList.name
})

export interface TokenListWithId extends TokenList {
  l2ChainId: string
  bridgeTokenListId: number
  isValid?: boolean
}

export const validateTokenList = (tokenList: TokenList) => {
  const ajv = new Ajv()
  addFormats(ajv)
  // https://github.com/OffchainLabs/arbitrum-token-lists/blob/master/src/lib/validateTokenList.ts#L10
  schema.properties.tokens.maxItems = 15_000
  const validate = ajv.compile(schema)

  return validate(tokenList)
}

export const addBridgeTokenListToBridge = (
  bridgeTokenList: BridgeTokenList,
  arbTokenBridge: ArbTokenBridge
) => {
  fetchTokenListFromURL(bridgeTokenList.url).then(
    ({ isValid, data: tokenList }) => {
      if (!isValid) return

      arbTokenBridge.token.addTokensFromList(tokenList!, bridgeTokenList.id)
    }
  )
}

export async function fetchTokenListFromURL(tokenListURL: string): Promise<{
  isValid: boolean
  data: TokenList | undefined
}> {
  try {
    const { data } = await axios.get(tokenListURL, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    })

    const isValid = validateTokenList(data)

    const tokenList = BRIDGE_TOKEN_LISTS.find(list => list.url === tokenListURL)

    if (tokenList) {
      tokenList.isValid = isValid
    }

    if (!isValid) {
      console.warn('Token List Invalid', data)
    }

    return { isValid, data }
  } catch (error) {
    console.warn('Token List URL Invalid', tokenListURL)
    return { isValid: false, data: undefined }
  }
}
