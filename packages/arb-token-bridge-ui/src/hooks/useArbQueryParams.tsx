/*

  This hook is an abstraction over `useQueryParams` hooks' library
  - It contains all the browser query params we use / intend to use in our application
  - Provides methods to listen to, and update all these query params
  - If we introduce a new queryParam for our bridge in the future, define it here and it will be accessible throughout the app :)

  - Example - to get the value of `?amount=` in browser, simply use
    `const [{ amount }] = useArbQueryParams()`

  - Example - to set the value of `?amount=` in browser, simply use
    `const [, setQueryParams] = useArbQueryParams()`
    `setQueryParams(newAmount)`

*/
import queryString from 'query-string'
import NextAdapterPages from 'next-query-params/pages'
import {
  BooleanParam,
  QueryParamProvider,
  StringParam,
  decodeNumber,
  decodeString,
  useQueryParams,
  withDefault
} from 'use-query-params'

import {
  ChainKeyQueryParam,
  getChainForChainKeyQueryParam,
  getChainQueryParamForChain,
  isValidChainQueryParam
} from '../types/ChainQueryParam'
import { ChainId } from '../types/ChainId'
import { defaultTheme, ThemeConfig } from './useTheme'

export enum TabParamEnum {
  BRIDGE = 'bridge',
  TX_HISTORY = 'tx_history'
}

export enum DisabledFeatures {
  BATCH_TRANSFERS = 'batch-transfers',
  TX_HISTORY = 'tx-history',
  NETWORK_SELECTION = 'network-selection',
  TRANSFERS_TO_NON_ARBITRUM_CHAINS = 'transfers-to-non-arbitrum-chains'
}

export enum AmountQueryParamEnum {
  MAX = 'max'
}

export enum ModeParamEnum {
  EMBED = 'embed'
  // add other modes when we have a use case for it
}

export const tabToIndex = {
  [TabParamEnum.BRIDGE]: 0,
  [TabParamEnum.TX_HISTORY]: 1
} as const satisfies Record<TabParamEnum, number>

export const indexToTab = {
  0: TabParamEnum.BRIDGE,
  1: TabParamEnum.TX_HISTORY
} as const satisfies Record<number, TabParamEnum>

export const isValidDisabledFeature = (feature: string) => {
  return Object.values(DisabledFeatures).includes(
    feature.toLowerCase() as DisabledFeatures
  )
}

export const DisabledFeaturesParam = {
  encode: (disabledFeatures: string[] | undefined) => {
    if (!disabledFeatures?.length) {
      return undefined
    }

    const url = new URLSearchParams()
    const dedupedFeatures = new Set(
      disabledFeatures
        .map(feature => feature.toLowerCase())
        .filter(feature => isValidDisabledFeature(feature))
    )

    for (const feature of dedupedFeatures) {
      url.append('disabledFeatures', feature)
    }

    return url.toString()
  },
  decode: (value: string | (string | null)[] | null | undefined) => {
    if (!value) return []

    // Handle both string and array inputs
    const features =
      typeof value === 'string'
        ? [value]
        : value.filter((val): val is string => val !== null)

    // Normalize, validate and deduplicate in one pass
    const dedupedFeatures = new Set<string>()
    for (const feature of features) {
      const normalized = feature.toLowerCase()
      if (isValidDisabledFeature(normalized)) {
        dedupedFeatures.add(normalized)
      }
    }

    return Array.from(dedupedFeatures)
  }
}

export const ThemeParam = {
  encode: (config: ThemeConfig | undefined) => {
    if (!config) return undefined
    try {
      return encodeURIComponent(JSON.stringify(config)) // Encode the JSON string to handle special characters like # in hex colors
    } catch {
      return undefined
    }
  },
  decode: (
    configStr: string | (string | null)[] | null | undefined
  ): ThemeConfig => {
    if (!configStr || Array.isArray(configStr)) return defaultTheme
    try {
      const decodedTheme = JSON.parse(decodeURIComponent(configStr))
      return { ...defaultTheme, ...decodedTheme }
    } catch {
      return defaultTheme
    }
  }
}

const ModeParam = {
  encode: (mode: ModeParamEnum) => {
    if (!mode) return undefined
    return mode
  },
  decode: (value: string | (string | null)[] | null | undefined) => {
    const modeStr = value?.toString()?.toLowerCase()
    if (modeStr === ModeParamEnum.EMBED) {
      return modeStr
    }
    return undefined
  }
}

export const useArbQueryParams = () => {
  /*
    returns [
      queryParams (getter for all query state variables),
      setQueryParams (setter for all query state variables)
    ]
  */
  return useQueryParams({
    sourceChain: ChainParam,
    destinationChain: ChainParam,
    amount: withDefault(AmountQueryParam, ''), // amount which is filled in Transfer panel
    amount2: withDefault(AmountQueryParam, ''), // extra eth to send together with erc20
    destinationAddress: withDefault(StringParam, undefined),
    token: TokenQueryParam, // import a new token using a Dialog Box
    settingsOpen: withDefault(BooleanParam, false),
    tab: withDefault(TabParam, tabToIndex[TabParamEnum.BRIDGE]), // which tab is active
    disabledFeatures: withDefault(DisabledFeaturesParam, []), // disabled features in the bridge
    mode: withDefault(ModeParam, undefined), // mode: 'embed', or undefined for normal mode
    theme: withDefault(ThemeParam, defaultTheme) // theme customization
  })
}

const isMax = (amount: string | undefined) =>
  amount?.toLowerCase() === AmountQueryParamEnum.MAX

/**
 * Sanitise amount value
 * @param amount - transfer amount value from the input field or from the URL
 * @returns sanitised value
 */
export const sanitizeAmountQueryParam = (amount: string) => {
  // no need to process empty string
  if (amount.length === 0) {
    return amount
  }

  const parsedAmount = amount.replace(/[,]/g, '.').toLowerCase()

  // add 0 to values starting with .
  if (parsedAmount.startsWith('.')) {
    return `0${parsedAmount}`
  }

  // to catch strings like `amount=asdf` from the URL
  if (isNaN(Number(parsedAmount))) {
    // return original string if the string is `max` (case-insensitive)
    // it doesn't show on the input[type=number] field because it isn't in the allowed chars
    return isMax(parsedAmount) ? parsedAmount : ''
  }

  // to reach here they must be a number
  // check for negative sign at first char
  if (parsedAmount.startsWith('-')) {
    return String(Math.abs(Number(parsedAmount)))
  }

  // replace leading zeros and spaces
  // this regex finds 1 or more 0s before any digits including 0
  // but the digits are not captured into the result string
  return parsedAmount.replace(/(^0+(?=\d))| /g, '')
}

// Our custom query param type for Amount field - will be parsed and returned as a string,
// but we need to make sure that only valid numeric-string values are considered, else return '0'
// Defined here so that components can directly rely on this for clean amount values and not rewrite parsing logic everywhere it gets used
export const AmountQueryParam = {
  // type of amount is always string | undefined coming from the input element onChange event `e.target.value`
  encode: (amount: string | undefined = '') => sanitizeAmountQueryParam(amount),
  decode: (amount: string | (string | null)[] | null | undefined) => {
    // toString() casts the potential string array into a string
    const amountStr = amount?.toString() ?? ''
    return sanitizeAmountQueryParam(amountStr)
  }
}

const TokenQueryParam = {
  encode: (token: string | undefined) => {
    return token?.toLowerCase()
  },
  decode: (token: string | (string | null)[] | null | undefined) => {
    const tokenStr = token?.toString()
    // We are not checking for a valid address because we handle it in the UI
    // by showing an invalid token dialog
    return tokenStr?.toLowerCase()
  }
}

// Parse chainId to ChainQueryParam or ChainId for orbit chain
export function encodeChainQueryParam(
  chainId: number | null | undefined
): string | undefined {
  if (!chainId) {
    return undefined
  }

  try {
    const chain = getChainQueryParamForChain(chainId)
    return chain.toString()
  } catch (e) {
    return undefined
  }
}

function isValidNumber(value: number | null | undefined): value is number {
  if (typeof value === 'undefined' || value === null) {
    return false
  }

  return !Number.isNaN(value)
}

// Parse ChainQueryParam/ChainId to ChainId
// URL accept both chainId and chainQueryParam (string)
export function decodeChainQueryParam(
  value: string | (string | null)[] | null | undefined
  // ChainId type doesn't include custom orbit chain, we need to add number type
): ChainId | number | undefined {
  const valueString = decodeString(value)
  if (!valueString) {
    return undefined
  }

  const valueNumber = decodeNumber(value)
  if (
    isValidNumber(valueNumber) &&
    isValidChainQueryParam(valueNumber as ChainId)
  ) {
    return valueNumber
  }

  if (isValidChainQueryParam(valueString)) {
    return getChainForChainKeyQueryParam(valueString as ChainKeyQueryParam).id
  }

  return undefined
}

export const ChainParam = {
  encode: encodeChainQueryParam,
  decode: decodeChainQueryParam
}

export function encodeTabQueryParam(
  tabIndex: number | null | undefined
): string {
  if (typeof tabIndex === 'number' && tabIndex in indexToTab) {
    return indexToTab[tabIndex as keyof typeof indexToTab]
  }
  return TabParamEnum.BRIDGE
}

// Parse string to number
// URL accepts string only
export function decodeTabQueryParam(
  tab: string | (string | null)[] | null | undefined
): number {
  if (typeof tab === 'string' && tab in tabToIndex) {
    return tabToIndex[tab as TabParamEnum]
  }
  return tabToIndex[TabParamEnum.BRIDGE]
}

export const TabParam = {
  encode: encodeTabQueryParam,
  decode: decodeTabQueryParam
}

export function ArbQueryParamProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <QueryParamProvider
      adapter={NextAdapterPages}
      options={{
        searchStringToObject: queryString.parse,
        objectToSearchString: queryString.stringify,
        updateType: 'replaceIn', // replace just a single parameter when updating query-state, leaving the rest as is
        removeDefaultsFromUrl: true,
        enableBatching: true
      }}
    >
      {children}
    </QueryParamProvider>
  )
}
