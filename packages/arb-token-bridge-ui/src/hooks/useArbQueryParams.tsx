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
import { NextAdapter } from 'next-query-params'
import { parse, stringify } from 'query-string'
import {
  NumberParam,
  QueryParamProvider,
  StringParam,
  useQueryParams,
  withDefault
} from 'use-query-params'

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
    amount: withDefault(AmountQueryParam, ''), // amount which is filled in Transfer panel
    l2ChainId: NumberParam, // L2 chain-id with which we can initiaze (override) our networks/signer
    token: StringParam // import a new token using a Dialog Box
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

  // add 0 to values starting with .
  if (amount.startsWith('.')) {
    return `0${amount}`
  }

  // to catch strings like `amount=asdf` from the URL
  if (isNaN(Number(amount))) {
    // return original string if the string is `max` (case-insensitive)
    // it doesn't show on the input[type=number] field because it isn't in the allowed chars
    return isMax(amount) ? amount : ''
  }

  // to reach here they must be a number
  // check for negative sign at first char
  if (amount.startsWith('-')) {
    return String(Math.abs(Number(amount)))
  }

  // replace leading zeros
  // this regex finds 1 or more 0s before any digits including 0
  // but the digits are not captured into the result string
  return amount.replace(/^0+(?=\d)/, '')
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

export function ArbQueryParamProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <QueryParamProvider
      adapter={NextAdapter}
      options={{
        searchStringToObject: parse,
        objectToSearchString: stringify,
        updateType: 'replaceIn', // replace just a single parameter when updating query-state, leaving the rest as is
        removeDefaultsFromUrl: true
      }}
    >
      {children}
    </QueryParamProvider>
  )
}
