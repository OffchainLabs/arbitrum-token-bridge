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
    amount: withDefault(AmountQueryParam, ''), // amount which is filled in Transfer panel
    token: StringParam, // import a new token using a Dialog Box
    settingsOpen: withDefault(BooleanParam, false)
  })
}

const isMax = (amount: string | undefined) =>
  amount?.toLowerCase() === AmountQueryParamEnum.MAX

/**
 * Sanitise amount value
 * @param amount - transfer amount value from the input field or from the URL
 * @returns sanitised value
 */
const sanitizeAmountQueryParam = (amount: string) => {
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

  // replace leading zeros
  // this regex finds 1 or more 0s before any digits including 0
  // but the digits are not captured into the result string
  return parsedAmount.replace(/^0+(?=\d)/, '')
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
        updateType: 'replaceIn', // replace just a single parameter when updating query-state, leaving the rest as is
        removeDefaultsFromUrl: true
      }}
    >
      {children}
    </QueryParamProvider>
  )
}
