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
import React, { useCallback, useEffect, useRef } from 'react'
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
import { useRouter } from 'next/router'
import { useSearchParams } from 'next/navigation'

import {
  ChainKeyQueryParam,
  getChainForChainKeyQueryParam,
  getChainQueryParamForChain,
  isValidChainQueryParam
} from '../types/ChainQueryParam'
import { ChainId } from '../util/networks'
import { initial } from 'lodash-es'

export enum AmountQueryParamEnum {
  MAX = 'max'
}

type QueryParams = {
  sourceChain: ChainId | number | undefined
  destinationChain: ChainId | number | undefined
  amount: string | undefined
  token: string | undefined
  settingsOpen: boolean | undefined
}
type QueryParamsArgs = Partial<QueryParams>

type SetQueryParamsFn = (queryParams: QueryParamsArgs) => void
function useEventCallback(fn: SetQueryParamsFn, dependencies: any) {
  const ref = useRef<SetQueryParamsFn>()

  useEffect(() => {
    ref.current = fn
  }, [fn, ...dependencies])

  return useCallback(
    (queryParams: QueryParamsArgs) => {
      const fn = ref.current
      console.log('CALLLBACK', queryParams)
      return fn?.(queryParams)
    },
    [ref]
  )
}

const ChainQueryParam = {
  encode: (chainId: ChainId | undefined) => encodeChainQueryParam(chainId),
  decode: (chainQueryParam: string | (string | null)[] | null | undefined) =>
    decodeChainQueryParam(chainQueryParam)
}
const AmountQueryParam = {
  // type of amount is always string | undefined coming from the input element onChange event `e.target.value`
  encode: (amount: string | undefined = '') => sanitizeAmountQueryParam(amount),
  decode: (amount: string | (string | null)[] | null | undefined) => {
    if (Array.isArray(amount)) {
      return null
    }
    return sanitizeAmountQueryParam(amount)
  }
}

let initialQuery = new URLSearchParams(window.location.search)
export const useArbQueryParams = () => {
  const { replace, query } = useRouter()

  const setQueryParams = useEventCallback(
    (newQueryParams: QueryParamsArgs) => {
      // const queryParams = { ...query }
      const queryParams = new URLSearchParams(initialQuery)

      if ('amount' in newQueryParams) {
        const sanitizedAmount = AmountQueryParam.encode(newQueryParams.amount)
        if (sanitizedAmount) {
          // queryParams.amount = sanitizedAmount
          queryParams.set('amount', sanitizedAmount)
        } else {
          // delete queryParams.amount
          queryParams.delete('amount')
        }
      }

      if ('sourceChain' in newQueryParams) {
        const sanitizedSourceChain = ChainQueryParam.encode(
          newQueryParams.sourceChain
        )
        if (sanitizedSourceChain) {
          // queryParams.sourceChain = sanitizedSourceChain
          queryParams.set('sourceChain', sanitizedSourceChain)
        } else {
          // delete queryParams.sourceChain
          queryParams.delete('sourceChain')
        }
      }

      if ('destinationChain' in newQueryParams) {
        const sanitizedDestinationChain = ChainQueryParam.encode(
          newQueryParams.destinationChain
        )
        if (sanitizedDestinationChain) {
          // queryParams.destinationChain = sanitizedDestinationChain
          queryParams.set('destinationChain', sanitizedDestinationChain)
        } else {
          // delete queryParams.destinationChain
          queryParams.delete('destinationChain')
        }
      }

      if ('settingsOpen' in newQueryParams) {
        if (newQueryParams.settingsOpen) {
          // queryParams.settingsOpen = 'true'
          queryParams.set('settingsOpen', 'true')
        } else {
          // delete queryParams.settingsOpen
          queryParams.delete('settingsOpen')
        }
      }

      initialQuery = queryParams
      replace({
        query: {
          ...Object.fromEntries(queryParams)
          // ...queryParams
        }
      })
    },
    [query]
  )
  // const setQueryParams = useCallback((newQueryParams: any) => {
  //   const queryParams = new URLSearchParams(initialQuery)

  //   if ('amount' in newQueryParams) {
  //     const sanitizedAmount = AmountQueryParam.encode(newQueryParams.amount)
  //     if (sanitizedAmount) {
  //       // queryParams.amount = sanitizedAmount
  //       queryParams.set('amount', sanitizedAmount)
  //     } else {
  //       // delete queryParams.amount
  //       queryParams.delete('amount')
  //     }
  //   }

  //   console.log('new query:', queryParams.toString())
  //   initialQuery = queryParams
  //   replace({
  //     query: {
  //       ...Object.fromEntries(queryParams)
  //     }
  //   })
  // }, [])

  return [
    {
      sourceChain: ChainQueryParam.decode(query.sourceChain),
      destinationChain: ChainQueryParam.decode(query.destinationChain),
      amount: AmountQueryParam.decode(query.amount),
      token: query.token as string,
      settingsOpen: query.settingsOpen === 'true'
    },
    setQueryParams
  ] as const

  //  return useQueryParams({
  //   sourceChain: ChainParam,
  //   destinationChain: ChainParam,
  //   amount: withDefault(AmountQueryParam, ''), // amount which is filled in Transfer panel
  //   token: StringParam, // import a new token using a Dialog Box
  //   settingsOpen: withDefault(BooleanParam, false)
  // })
}

const isMax = (amount: string | undefined) =>
  amount?.toLowerCase() === AmountQueryParamEnum.MAX

/**
 * Sanitise amount value
 * @param amount - transfer amount value from the input field or from the URL
 * @returns sanitised value
 */
const sanitizeAmountQueryParam = (
  amount: string | null | undefined
): string => {
  // no need to process empty string
  if (!amount || amount.length === 0) {
    return ''
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

// Parse chainId to ChainQueryParam or ChainId for orbit chain
function encodeChainQueryParam(
  chainId: ChainId | undefined
): ChainKeyQueryParam | string | undefined {
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

// TODO: delete
export function ArbQueryParamProvider({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
