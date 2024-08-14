import * as Sentry from '@sentry/react'

export function captureSentryErrorWithExtraData({
  error,
  originFunction,
  additionalData
}: {
  error: unknown
  originFunction: string
  additionalData?: Record<string, string>
}) {
  Sentry.configureScope(function (scope) {
    // tags only allow primitive values
    scope.setTag('origin function', originFunction)
    if (additionalData) {
      scope.setTags(additionalData)
    }
    Sentry.captureException(error, () => scope)
  })
}
