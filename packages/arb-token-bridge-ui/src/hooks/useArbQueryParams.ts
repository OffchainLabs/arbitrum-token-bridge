/*

  This hook is an abstraction over `useQueryParams` hooks' library
  - It contains all the browser query params we use / intend to use in our application 
  - Provides methods to listen to, and update all these query params
  - If we introduce a new queryParam for our bridge in the future, define it here and it will be accessible throughout the app :)
  
  - Example - to get the value of `?amount=` in browser, simply use
    `const { amount } = useArbQueryParams()`

*/

import { NumberParam, StringParam, useQueryParams } from 'use-query-params'

type ArbQueryParamsType = {
  amount?: string | null | undefined
  l2ChainId?: number | null | undefined
  token?: string | null | undefined
}

const useArbQueryParams = () => {
  const [queryParams, setQueryParams] = useQueryParams({
    amount: StringParam, // amount which is filled in Transfer panel
    l2ChainId: NumberParam, // L2 chain-id with which we can initiaze (override) our networks/signer
    token: StringParam // import a new token using a Dialog Box
  })

  const updateQueryParams = (params: ArbQueryParamsType) => {
    setQueryParams(params, 'replaceIn')
  }

  return { ...queryParams, updateQueryParams }
}

export default useArbQueryParams
