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
  NumberParam,
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

// Our custom query param type for Amount field - will be parsed and returned as a string,
// but we need to make sure that only valid numeric-string values are considered, else return '0'
// Defined here so that components can directly rely on this for clean amount values and not rewrite parsing logic everywhere it gets used
const AmountQueryParam = {
  // type of amount is always string | undefined coming from the input element onChange event `e.target.value`
  encode: (amount: string | null | undefined) => amount,
  decode: (amount: string | (string | null)[] | null | undefined) => {
    const amountStr = amount?.toString()

    // to catch random string like `amount=asdf` from the URL
    if (isNaN(Number(amountStr))) {
      if (amountStr?.toLowerCase() === AmountQueryParamEnum.MAX) {
        return amountStr
      }
      return ''
    }

    return amountStr ?? ''
  }
}
