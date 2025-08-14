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
import {
  createParser,
  parseAsBoolean,
  parseAsString,
  useQueryStates
} from 'nuqs'
import { NuqsAdapter } from 'nuqs/adapters/next/pages'

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

export const DisabledFeaturesParam = createParser({
  parse: value => {
    if (!value) return []

    // Handle both string and array inputs
    const features = Array.isArray(value)
      ? value
      : value
          .toString()
          .split(',')
          .map(f => f.trim())
          .filter(f => f.length > 0)

    // Normalize, validate and deduplicate in one pass
    const dedupedFeatures = new Set<string>()
    for (const feature of features) {
      const normalized = feature.toLowerCase()
      if (isValidDisabledFeature(normalized)) {
        dedupedFeatures.add(normalized)
      }
    }

    return Array.from(dedupedFeatures)
  },
  serialize: disabledFeatures => {
    if (!disabledFeatures?.length) {
      return ''
    }

    const dedupedFeatures = new Set(
      disabledFeatures
        .map(feature => feature.toLowerCase())
        .filter(feature => isValidDisabledFeature(feature))
    )

    return Array.from(dedupedFeatures).join(',')
  }
})

export const ThemeParam = createParser({
  parse: configStr => {
    if (!configStr || Array.isArray(configStr)) return defaultTheme
    try {
      const decodedTheme = JSON.parse(decodeURIComponent(configStr))
      return { ...defaultTheme, ...decodedTheme }
    } catch {
      return defaultTheme
    }
  },
  serialize: (config: ThemeConfig | undefined) => {
    if (!config || JSON.stringify(config) === JSON.stringify(defaultTheme))
      return ''
    try {
      return encodeURIComponent(JSON.stringify(config)) // Encode the JSON string to handle special characters like # in hex colors
    } catch {
      return ''
    }
  }
})

const ModeParam = createParser({
  parse: value => {
    const modeStr = value?.toString()?.toLowerCase()
    if (modeStr === ModeParamEnum.EMBED) {
      return modeStr
    }
    return null
  },
  serialize: (mode: ModeParamEnum) => {
    if (!mode) return ''
    return mode
  }
})

export const useArbQueryParams = () => {
  /*
    returns [
      queryParams (getter for all query state variables),
      setQueryParams (setter for all query state variables)
    ]
  */
  return useQueryStates(
    {
      sourceChain: ChainParam,
      destinationChain: ChainParam,
      amount: AmountQueryParam.withDefault(''), // amount which is filled in Transfer panel
      amount2: AmountQueryParam.withDefault(''), // extra eth to send together with erc20
      destinationAddress: parseAsString.withDefault(''), // not present in URL when undefined
      token: parseAsString.withDefault(''), // import a new token using a Dialog Box - not present in URL when undefined
      settingsOpen: parseAsBoolean.withDefault(false),
      tab: TabParam.withDefault(tabToIndex[TabParamEnum.BRIDGE]), // which tab is active
      disabledFeatures: DisabledFeaturesParam.withDefault([]), // disabled features in the bridge
      mode: ModeParam, // mode: 'embed', or undefined for normal mode
      theme: ThemeParam.withDefault(defaultTheme) // theme customization
    },
    {
      clearOnDefault: true
    }
  )
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
export const AmountQueryParam = createParser({
  parse: amount => {
    // toString() casts the potential string array into a string
    const amountStr = amount?.toString() ?? ''
    return sanitizeAmountQueryParam(amountStr)
  },
  serialize: (amount = '') => {
    const sanitized = sanitizeAmountQueryParam(amount)
    return sanitized || ''
  }
})

// Parse chainId to ChainQueryParam or ChainId for orbit chain
export function encodeChainQueryParam(
  chainId: number | null | undefined
): string {
  if (!chainId) {
    return ''
  }

  try {
    const chain = getChainQueryParamForChain(chainId)
    return chain.toString()
  } catch (e) {
    return ''
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
  value: string | null | undefined
  // ChainId type doesn't include custom orbit chain, we need to add number type
): ChainId | number | undefined {
  if (!value) {
    return undefined
  }

  const valueNumber = parseInt(value, 10)
  if (
    isValidNumber(valueNumber) &&
    isValidChainQueryParam(valueNumber as ChainId)
  ) {
    return valueNumber
  }

  if (isValidChainQueryParam(value)) {
    return getChainForChainKeyQueryParam(value as ChainKeyQueryParam).id
  }

  return undefined
}

export const ChainParam = createParser({
  parse: decodeChainQueryParam,
  serialize: encodeChainQueryParam
})

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
export function decodeTabQueryParam(tab: string | null | undefined): number {
  if (typeof tab === 'string' && tab in tabToIndex) {
    return tabToIndex[tab as TabParamEnum]
  }
  return tabToIndex[TabParamEnum.BRIDGE]
}

export const TabParam = createParser({
  parse: decodeTabQueryParam,
  serialize: encodeTabQueryParam
})

export function ArbQueryParamProvider({
  children
}: {
  children: React.ReactNode
}) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}
