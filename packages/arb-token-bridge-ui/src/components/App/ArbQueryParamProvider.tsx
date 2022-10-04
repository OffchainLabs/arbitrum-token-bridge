import React from 'react'
import { QueryParamProvider } from 'use-query-params'
import { ReactRouter5Adapter } from 'use-query-params/adapters/react-router-5'
import { parse, stringify } from 'query-string'

export function ArbQueryParamProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <QueryParamProvider
      adapter={ReactRouter5Adapter}
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
