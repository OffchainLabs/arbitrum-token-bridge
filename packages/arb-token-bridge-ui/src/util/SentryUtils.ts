import * as Sentry from '@sentry/react'

export function captureSentryErrorWithExtraData({
  error,
  originFunction,
  erc20ParentAddress,
  additionalData
}: {
  error: unknown
  originFunction: string
  erc20ParentAddress?: string
  additionalData?: Record<string, string>[]
}) {
  Sentry.configureScope(function (scope) {
    // tags only allow primitive values
    scope.setTag('origin function', originFunction)
    scope.setTag('type', erc20ParentAddress ? 'token' : 'native currency')
    if (erc20ParentAddress) {
      scope.setTag('erc20 address on parent chain: ', erc20ParentAddress)
    }
    if (additionalData) {
      for (const data of additionalData) {
        const key = Object.keys(data)[0]
        if (typeof key !== 'string') {
          break
        }
        const value = data[key]
        scope.setTag(key, value)
      }
    }
    Sentry.captureException(error, () => scope)
  })
}
