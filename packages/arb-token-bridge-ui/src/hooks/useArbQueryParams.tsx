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
import React from 'react'
import NextAdapterPages from 'next-query-params/pages'
import queryString from 'query-string'
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
import { ChainId } from '../util/networks'

export enum AmountQueryParamEnum {
  MAX = 'max'
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
    amount: withDefault(StringParam, ''), // amount which is filled in Transfer panel
    token: StringParam, // import a new token using a Dialog Box
    settingsOpen: withDefault(BooleanParam, false)
  })
}

// Parse chainId to ChainQueryParam or ChainId for orbit chain
function encodeChainQueryParam(
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
function decodeChainQueryParam(
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
        enableBatching: true,
        updateType: 'replaceIn', // replace just a single parameter when updating query-state, leaving the rest as is
        removeDefaultsFromUrl: true
      }}
    >
      {children}
    </QueryParamProvider>
  )
}
