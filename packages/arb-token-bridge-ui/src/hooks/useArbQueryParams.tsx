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
import NextAdapterApp from 'next-query-params/app'
import {
  BooleanParam,
  QueryParamProvider,
  StringParam,
  useQueryParams,
  withDefault
} from 'use-query-params'

import { defaultTheme } from './useTheme'
import {
  TabParamEnum,
  DisabledFeatures,
  ModeParamEnum,
  AmountQueryParamEnum,
  tabToIndex,
  indexToTab,
  isValidDisabledFeature,
  DisabledFeaturesParam,
  encodeChainQueryParam,
  decodeChainQueryParam,
  encodeTabQueryParam,
  decodeTabQueryParam,
  ModeParam,
  ThemeParam,
  AmountQueryParam,
  sanitizeAmountQueryParam,
  TokenQueryParam,
  ChainParam,
  TabParam
} from '../util/queryParamUtils'

export {
  TabParamEnum,
  DisabledFeatures,
  ModeParamEnum,
  AmountQueryParamEnum,
  tabToIndex,
  indexToTab,
  isValidDisabledFeature,
  DisabledFeaturesParam,
  encodeChainQueryParam,
  decodeChainQueryParam,
  encodeTabQueryParam,
  decodeTabQueryParam,
  ThemeParam,
  AmountQueryParam,
  sanitizeAmountQueryParam,
  TokenQueryParam,
  ChainParam,
  TabParam
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
    tab: TabParam, // which tab is active
    disabledFeatures: withDefault(DisabledFeaturesParam, []), // disabled features in the bridge
    mode: withDefault(ModeParam, undefined), // mode: 'embed', or undefined for normal mode
    theme: withDefault(ThemeParam, defaultTheme) // theme customization
  })
}

export function ArbQueryParamProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <QueryParamProvider
      adapter={NextAdapterApp}
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
